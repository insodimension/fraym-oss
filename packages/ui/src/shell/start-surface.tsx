import type { SessionDriver, SessionRef, SessionSnapshot, WorkspaceRef } from "@fraym-ai/driver";
import { type MouseEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import { PopoverDivider, PopoverHeading, PopoverPanel, PopoverRow } from "../elements";
import {
	Composer,
	type ComposerSubmit,
	setActiveComposerDraftKey,
	useComposerDraft,
	useSessionComposerDraft,
} from "../features";
import { useArgumentCompletions } from "../hooks/use-argument-completions";
import { useFileCompletions } from "../hooks/use-file-completions";
import { useSlashCommands } from "../hooks/use-slash-commands";
import type { WorkspaceAnalyticsState } from "../hooks/use-workspace-analytics";
import { Icon, type IconName } from "../icons";
import { cn } from "../lib/cn";
import { sessionRefKey } from "./session-groups";

type StartMenu = "project" | "work" | "branch" | null;


export interface StartSurfaceProps {
	readonly workspace: WorkspaceRef | null | undefined;
	readonly workspaces: readonly WorkspaceRef[];
	readonly sessions: readonly SessionSnapshot[];
	readonly analytics: WorkspaceAnalyticsState;
	readonly committed: string;
	readonly onComposerChange: (value: string) => void;
	readonly onSubmit: ComposerSubmit;
	readonly onSlash: () => void;
	readonly onStop?: () => void;
	readonly streaming?: boolean;
	readonly disabled?: boolean;
	readonly leftSlot?: ReactNode;
	readonly rightSlot?: ReactNode;
	readonly sessionDriver: SessionDriver | null | undefined;
	readonly sessionRef: SessionRef | null | undefined;
	readonly onWorkspaceSelect?: (workspace: WorkspaceRef) => void;
	readonly onAddProject?: () => void;
	readonly onBranchSelect?: (branch: string) => void;
	readonly onNewWorktree?: () => void;
	readonly onMoveToWorktree?: (sessionRef: SessionRef) => void;
}

interface MenuState {
	readonly type: StartMenu;
	readonly rect: DOMRect | null;
}

function workspaceName(workspace: WorkspaceRef | null | undefined): string {
	return workspace?.displayName ?? workspace?.path.split(/[\\/]/).filter(Boolean).at(-1) ?? "workspace";
}

function workspaceKey(workspace: WorkspaceRef): string {
	return workspace.workspaceId || workspace.path || workspace.displayName || "workspace";
}

function currentBranch(workspace: WorkspaceRef | null | undefined): string {
	return workspace?.git?.currentBranch || "No branch";
}

function sameWorkspace(a: WorkspaceRef | null | undefined, b: WorkspaceRef | null | undefined): boolean {
	return Boolean(a && b && workspaceKey(a) === workspaceKey(b));
}

function uniqueWorkspaces(
	workspace: WorkspaceRef | null | undefined,
	workspaces: readonly WorkspaceRef[],
	sessions: readonly SessionSnapshot[],
): readonly WorkspaceRef[] {
	const byKey = new Map<string, WorkspaceRef>();
	if (workspace) byKey.set(workspaceKey(workspace), workspace);
	for (const candidate of workspaces) byKey.set(workspaceKey(candidate), candidate);
	for (const session of sessions) byKey.set(workspaceKey(session.workspace), session.workspace);
	return [...byKey.values()];
}

function daysBetween(a: Date, b: Date): number {
	const dayMs = 24 * 60 * 60 * 1000;
	return Math.round(
		(Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate()) -
			Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate())) /
			dayMs,
	);
}

function activityCells(sessions: readonly SessionSnapshot[]): readonly number[] {
	const weeks = 52;
	const days = 7;
	const today = new Date();
	const start = new Date(today);
	start.setUTCDate(today.getUTCDate() - (weeks * days - 1));
	const counts = new Map<number, number>();
	for (const session of sessions) {
		const parsed = Date.parse(session.updatedAt);
		if (!Number.isFinite(parsed)) continue;
		const index = daysBetween(start, new Date(parsed));
		if (index >= 0 && index < weeks * days) counts.set(index, (counts.get(index) ?? 0) + 1);
	}
	return Array.from({ length: weeks * days }, (_, index) => activityBucket(counts.get(index) ?? 0));
}

function activityBucket(count: number): number {
	if (count <= 0) return 0;
	if (count === 1) return 1;
	if (count <= 3) return 2;
	if (count <= 6) return 3;
	return 4;
}

function filterWorkspaces(options: readonly WorkspaceRef[], query: string): readonly WorkspaceRef[] {
	const normalized = query.trim().toLowerCase();
	if (!normalized) return options;
	return options.filter(option =>
		[workspaceName(option), option.displayName, option.path, option.workspaceId]
			.filter(Boolean)
			.join(" ")
			.toLowerCase()
			.includes(normalized),
	);
}

function StripButton({
	icon,
	label,
	active,
	disabled,
	onClick,
}: {
	readonly icon: IconName;
	readonly label: string;
	readonly active?: boolean;
	readonly disabled?: boolean;
	readonly onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
	return (
		<button
			type="button"
			data-slot="start-strip-button"
			disabled={disabled}
			onClick={onClick}
			className={cn(
				"inline-flex min-w-0 items-center gap-1.5 rounded-[8px] px-2 py-1.5 text-fr-sm text-fr-text-2 transition-colors",
				"hover:bg-fr-surface-2 hover:text-fr-text disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-transparent",
				active && "bg-fr-surface-2 text-fr-text",
			)}
		>
			<Icon name={icon} size={14} strokeWidth={1.7} />
			<span className="min-w-0 max-w-[190px] fr-overflow">{label}</span>
			<Icon name="caretD" size={12} strokeWidth={2} className="opacity-70" />
		</button>
	);
}

function DisabledRow({
	icon,
	label,
	value,
}: {
	readonly icon: IconName;
	readonly label: string;
	readonly value?: string;
}) {
	return (
		<PopoverRow
			icon={<Icon name={icon} size={15} />}
			label={label}
			value={value}
			className="cursor-not-allowed opacity-45 hover:bg-transparent"
		/>
	);
}

function SearchInput({
	value,
	placeholder,
	onChange,
}: {
	readonly value: string;
	readonly placeholder: string;
	readonly onChange: (value: string) => void;
}) {
	return (
		<div className="flex items-center gap-2 px-2.5 py-2 text-fr-sm text-fr-text-3">
			<Icon name="search" size={14} />
			<input
				value={value}
				onChange={event => onChange(event.target.value)}
				placeholder={placeholder}
				className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-fr-text-3"
			/>
		</div>
	);
}

function StartControlStrip({
	workspaceNameLabel,
	branchName,
	branchCount,
	onOpenMenu,
}: {
	readonly workspaceNameLabel: string;
	readonly branchName: string;
	readonly branchCount: number;
	readonly onOpenMenu: (type: Exclude<StartMenu, null>, event: MouseEvent<HTMLButtonElement>) => void;
}) {
	return (
		<div data-slot="start-control-strip" className="flex flex-wrap items-center gap-1">
			<StripButton icon="folder" label={workspaceNameLabel} onClick={event => onOpenMenu("project", event)} />
			<StripButton icon="computer" label="Work locally" onClick={event => onOpenMenu("work", event)} />
			<StripButton
				icon="git-branch"
				label={branchName}
				disabled={branchCount === 0}
				onClick={event => onOpenMenu("branch", event)}
			/>
		</div>
	);
}

function StartComposer({
	props,
	workspaceNameLabel,
	branchName,
	branchCount,
	onOpenMenu,
}: {
	readonly props: StartSurfaceProps;
	readonly workspaceNameLabel: string;
	readonly branchName: string;
	readonly branchCount: number;
	readonly onOpenMenu: (type: Exclude<StartMenu, null>, event: MouseEvent<HTMLButtonElement>) => void;
}) {
	// Own the draft here, right above the <Composer>, so a keystroke re-renders
	// only this subtree — never the sibling analytics dashboard. Parking this
	// state up in StartSurfaceStage repainted the whole start surface per key.
	const composerDraft = useComposerDraft(props.committed, props.onComposerChange, props.onSubmit);
	const slashCommands = useSlashCommands(composerDraft.value, props.sessionDriver, props.sessionRef);
	const canQuerySlashCommands = Boolean(props.sessionDriver && props.sessionRef);
	const fileCompletionSource = useFileCompletions(props.sessionDriver, props.sessionRef);
	const argumentCompletionSource = useArgumentCompletions(props.sessionDriver, props.sessionRef);
	// Persist image attachments per session so they don't bleed into the next
	// session when this start-surface composer stays mounted across a switch.
	const composerAttachments = useSessionComposerDraft(props.sessionRef ? sessionRefKey(props.sessionRef) : "");
	useEffect(() => {
		setActiveComposerDraftKey(props.sessionRef ? sessionRefKey(props.sessionRef) : "");
	}, [props.sessionRef]);
	return (
		<div className="flex w-full max-w-[760px] flex-col">
			<div className="mb-8 text-center">
				<h1 className="text-fr-2xl font-semibold text-fr-text">What should we build in {workspaceNameLabel}?</h1>
			</div>
			<Composer
				value={composerDraft.value}
				onChange={composerDraft.onChange}
				onSubmit={composerDraft.onSubmit}
				attachments={composerAttachments.attachments}
				onAttachmentsChange={composerAttachments.setAttachments}
				pasteAttachments={composerAttachments.pasteAttachments}
				onPasteAttachmentsChange={composerAttachments.setPasteAttachments}
				onSlash={props.onSlash}
				onStop={props.onStop}
				slashCommands={canQuerySlashCommands ? slashCommands : undefined}
				fileCompletionSource={fileCompletionSource}
				argumentCompletionSource={canQuerySlashCommands ? argumentCompletionSource : undefined}
				streaming={props.streaming}
				disabled={props.disabled}
				placeholder="Do anything"
				showTips
				leftSlot={props.leftSlot}
				rightSlot={props.rightSlot}
				className="bg-transparent px-0 pb-0 pt-0"
				footerSlot={
					<StartControlStrip
						workspaceNameLabel={workspaceNameLabel}
						branchName={branchName}
						branchCount={branchCount}
						onOpenMenu={onOpenMenu}
					/>
				}
			/>
		</div>
	);
}

function ProjectMenu({
	menu,
	query,
	options,
	currentWorkspace,
	onQueryChange,
	onSelect,
	onAddProject,
	onClose,
}: {
	readonly menu: MenuState;
	readonly query: string;
	readonly options: readonly WorkspaceRef[];
	readonly currentWorkspace: WorkspaceRef | null | undefined;
	readonly onQueryChange: (value: string) => void;
	readonly onSelect?: (workspace: WorkspaceRef) => void;
	readonly onAddProject?: () => void;
	readonly onClose: () => void;
}) {
	return (
		<PopoverPanel data-slot="start-project-menu" width={286} anchorRect={menu.rect} place="below">
			<SearchInput value={query} onChange={onQueryChange} placeholder="Search projects" />
			<PopoverDivider />
			<ProjectRows options={options} currentWorkspace={currentWorkspace} onSelect={onSelect} onClose={onClose} />
			<PopoverDivider />
			{onAddProject ? (
				<PopoverRow
					icon={<Icon name="folder" size={15} />}
					label="Add new project"
					onClick={() => {
						onAddProject();
						onClose();
					}}
				/>
			) : (
				<DisabledRow icon="folder" label="Add new project" value="not connected" />
			)}
			<DisabledRow icon="folder" label="Don't work in a project" value="not supported" />
		</PopoverPanel>
	);
}

function ProjectRows({
	options,
	currentWorkspace,
	onSelect,
	onClose,
}: {
	readonly options: readonly WorkspaceRef[];
	readonly currentWorkspace: WorkspaceRef | null | undefined;
	readonly onSelect?: (workspace: WorkspaceRef) => void;
	readonly onClose: () => void;
}) {
	return (
		<div className="max-h-[220px] overflow-y-auto">
			{options.map(option => (
				<PopoverRow
					key={workspaceKey(option)}
					icon={<Icon name="folder" size={15} />}
					label={workspaceName(option)}
					value={sameWorkspace(option, currentWorkspace) ? "current" : undefined}
					className={sameWorkspace(option, currentWorkspace) ? "text-fr-text" : undefined}
					onClick={() => {
						onSelect?.(option);
						onClose();
					}}
				/>
			))}
			{options.length === 0 && <div className="px-2.5 py-2 text-fr-sm text-fr-text-3">No matching projects</div>}
		</div>
	);
}

function WorkMenu({
	menu,
	onNewWorktree,
	onMoveToWorktree,
	onClose,
}: {
	readonly menu: MenuState;
	readonly onNewWorktree?: () => void;
	readonly onMoveToWorktree?: () => void;
	readonly onClose: () => void;
}) {
	return (
		<PopoverPanel data-slot="start-work-menu" width={246} anchorRect={menu.rect} place="below">
			<PopoverHeading>Start in</PopoverHeading>
			<PopoverRow icon={<Icon name="computer" size={15} />} label="Work locally" value="current" />
			{onNewWorktree ? (
				<PopoverRow
					icon={<Icon name="branch" size={15} />}
					label="New worktree"
					onClick={() => {
						onNewWorktree();
						onClose();
					}}
				/>
			) : (
				<DisabledRow icon="branch" label="New worktree" value="not connected" />
			)}
			{onMoveToWorktree && (
				<PopoverRow
					icon={<Icon name="git-branch" size={15} />}
					label="Move to worktree"
					onClick={() => {
						onMoveToWorktree();
						onClose();
					}}
				/>
			)}
			<DisabledRow icon="globe" label="Connect Codex web" value="not connected" />
			<DisabledRow icon="shield" label="Send to cloud" value="not connected" />
		</PopoverPanel>
	);
}

function BranchMenu({
	menu,
	query,
	branches,
	currentBranchName,
	onQueryChange,
	onBranchSelect,
	onClose,
}: {
	readonly menu: MenuState;
	readonly query: string;
	readonly branches: readonly string[];
	readonly currentBranchName: string;
	readonly onQueryChange: (value: string) => void;
	readonly onBranchSelect?: (branch: string) => void;
	readonly onClose: () => void;
}) {
	return (
		<PopoverPanel data-slot="start-branch-menu" width={298} anchorRect={menu.rect} place="below">
			<SearchInput value={query} onChange={onQueryChange} placeholder="Search branches" />
			<PopoverHeading>Branches</PopoverHeading>
			<BranchRows
				branches={branches}
				currentBranchName={currentBranchName}
				onBranchSelect={onBranchSelect}
				onClose={onClose}
			/>
			<PopoverDivider />
			<DisabledRow icon="branch" label="Checkout new branch" value="not connected" />
		</PopoverPanel>
	);
}

function BranchRows({
	branches,
	currentBranchName,
	onBranchSelect,
	onClose,
}: {
	readonly branches: readonly string[];
	readonly currentBranchName: string;
	readonly onBranchSelect?: (branch: string) => void;
	readonly onClose: () => void;
}) {
	return (
		<div className="max-h-[260px] overflow-y-auto">
			{branches.map(branch => (
				<PopoverRow
					key={branch}
					icon={<Icon name="branch" size={15} />}
					label={branch}
					value={branch === currentBranchName ? "current" : undefined}
					onClick={() => {
						if (branch !== currentBranchName) onBranchSelect?.(branch);
						onClose();
					}}
				/>
			))}
			{branches.length === 0 && <div className="px-2.5 py-2 text-fr-sm text-fr-text-3">No matching branches</div>}
		</div>
	);
}

function StartMenus({
	menu,
	projectQuery,
	branchQuery,
	filteredWorkspaces,
	filteredBranches,
	workspace,
	currentBranchName,
	onProjectQueryChange,
	onBranchQueryChange,
	onWorkspaceSelect,
	onAddProject,
	onNewWorktree,
	onMoveToWorktree,
	onBranchSelect,
	onClose,
}: {
	readonly menu: MenuState;
	readonly projectQuery: string;
	readonly branchQuery: string;
	readonly filteredWorkspaces: readonly WorkspaceRef[];
	readonly filteredBranches: readonly string[];
	readonly workspace: WorkspaceRef | null | undefined;
	readonly currentBranchName: string;
	readonly onProjectQueryChange: (value: string) => void;
	readonly onBranchQueryChange: (value: string) => void;
	readonly onWorkspaceSelect?: (workspace: WorkspaceRef) => void;
	readonly onAddProject?: () => void;
	readonly onNewWorktree?: () => void;
	readonly onMoveToWorktree?: () => void;
	readonly onBranchSelect?: (branch: string) => void;
	readonly onClose: () => void;
}) {
	return (
		<>
			{menu.type && <div className="fixed inset-0 z-40" onClick={onClose} />}
			{menu.type === "project" && (
				<ProjectMenu
					menu={menu}
					query={projectQuery}
					options={filteredWorkspaces}
					currentWorkspace={workspace}
					onQueryChange={onProjectQueryChange}
					onSelect={onWorkspaceSelect}
					onAddProject={onAddProject}
					onClose={onClose}
				/>
			)}
			{menu.type === "work" && (
				<WorkMenu menu={menu} onNewWorktree={onNewWorktree} onMoveToWorktree={onMoveToWorktree} onClose={onClose} />
			)}
			{menu.type === "branch" && (
				<BranchMenu
					menu={menu}
					query={branchQuery}
					branches={filteredBranches}
					currentBranchName={currentBranchName}
					onQueryChange={onBranchQueryChange}
					onBranchSelect={onBranchSelect}
					onClose={onClose}
				/>
			)}
		</>
	);
}

export function StartSurface(props: StartSurfaceProps) {
	const [menu, setMenu] = useState<MenuState>({ type: null, rect: null });
	const [projectQuery, setProjectQuery] = useState("");
	const [branchQuery, setBranchQuery] = useState("");
	const fallbackActivityCells = useMemo(() => activityCells(props.sessions), [props.sessions]);
	const workspaceOptions = useMemo(
		() => uniqueWorkspaces(props.workspace, props.workspaces, props.sessions),
		[props.sessions, props.workspace, props.workspaces],
	);
	const branchOptions = useMemo(() => props.workspace?.git?.branches ?? [], [props.workspace?.git?.branches]);
	const filteredWorkspaces = useMemo(
		() => filterWorkspaces(workspaceOptions, projectQuery),
		[projectQuery, workspaceOptions],
	);
	const filteredBranches = useMemo(() => {
		const query = branchQuery.trim().toLowerCase();
		return query ? branchOptions.filter(branch => branch.toLowerCase().includes(query)) : branchOptions;
	}, [branchOptions, branchQuery]);
	const closeMenu = () => setMenu({ type: null, rect: null });
	const openMenu = (type: Exclude<StartMenu, null>, event: MouseEvent<HTMLButtonElement>) =>
		setMenu({ type, rect: event.currentTarget.getBoundingClientRect() });
	const workspaceNameLabel = workspaceName(props.workspace);
	const branchName = currentBranch(props.workspace);

	return (
		<div data-slot="session-start" className="flex min-h-full flex-col items-center px-7 py-12">
			<div className="flex w-full flex-1 basis-0 flex-col items-center justify-end">
				<StartComposer
					props={props}
					workspaceNameLabel={workspaceNameLabel}
					branchName={branchName}
					branchCount={branchOptions.length}
					onOpenMenu={openMenu}
				/>
			</div>
			<StartMenus
				menu={menu}
				projectQuery={projectQuery}
				branchQuery={branchQuery}
				filteredWorkspaces={filteredWorkspaces}
				filteredBranches={filteredBranches}
				workspace={props.workspace}
				currentBranchName={branchName}
				onProjectQueryChange={setProjectQuery}
				onBranchQueryChange={setBranchQuery}
				onWorkspaceSelect={props.onWorkspaceSelect}
				onAddProject={props.onAddProject}
				onBranchSelect={props.onBranchSelect}
				onNewWorktree={props.onNewWorktree}
				onMoveToWorktree={
					props.sessionRef && !props.workspace?.git?.worktree && props.onMoveToWorktree
						? () => props.onMoveToWorktree?.(props.sessionRef as SessionRef)
						: undefined
				}
				onClose={closeMenu}
			/>
		</div>
	);
}
