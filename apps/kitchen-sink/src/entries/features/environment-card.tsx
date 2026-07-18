import { Badge, BranchName, cn, Icon } from "@fraym/ui";
import { type ReactNode, useState } from "react";
import type { ControlsSchema } from "../../showcase/controls";
import { useControls } from "../../showcase/controls";
import { Demo, Note } from "../../showcase/demo";
import type { EntryDocs } from "../../showcase/docs";
import type { ShowcaseEntry } from "../../showcase/types";

// ---------------------------------------------------------------------------
// DESIGN MOCK v4 — Environment card (fixture data, approval gate before impl).
//
// v4 ledger redesign after v3 critique: no inner boxes (typographic header on
// a hairline), no leading row icons (weight does the hierarchy; glyphs only
// where they carry state), actions as a dialog-style footer (ghost left,
// primary right), one 8px grid, one radius story (card 14 / buttons 8).
// Kept from v3: state-dependent prominence for submodule pins, Changes as a
// navigation row into the Diff dock, context-dependent single primary action.
// ---------------------------------------------------------------------------

/** Pin status of a submodule checkout vs the gitlink recorded in the parent. */
type PinState =
	| { readonly kind: "sync" } // checkout == recorded pin
	| { readonly kind: "ahead"; readonly by: number } // descends from pin — bump pending
	| { readonly kind: "drift" }; // NOT a descendant — committing clobbers siblings

interface RepoRow {
	readonly name: string;
	readonly branch: string;
	readonly ahead: number;
	readonly behind: number;
	readonly dirty: number;
	readonly pin?: PinState; // absent = superproject
	readonly pinnedSha?: string;
	readonly checkoutSha?: string;
}

function worktreeFixture(long: boolean) {
	const session = long ? "fraym/feature/worktrees-v2-environment-card-rework" : "fraym/feature/env-card-v2";
	return [
		{ branch: "main", kind: "main", here: false, path: "C:/workspace/fraym" },
		{ branch: session, kind: "session", here: true, path: "C:/workspace/fraym-worktrees/env-card-v2" },
		{ branch: "spike/scm-tree", kind: "foreign", here: false, path: "C:/workspace/fraym-scratch/scm-tree" },
	] as const;
}

const SERVERS = [
	{ name: "fraym web", port: 5185, cwd: "apps/web" },
	{ name: "kitchen sink", port: 5184, cwd: "fraym/apps/kitchen-sink" },
] as const;

function repoFixture(pinMode: "in sync" | "bump pending" | "drift", long: boolean): readonly RepoRow[] {
	const fraymPin: PinState =
		pinMode === "in sync"
			? { kind: "sync" }
			: pinMode === "bump pending"
				? { kind: "ahead", by: 2 }
				: { kind: "drift" };
	const fraymBranch = long ? "feature/environment-card-rework-and-polish" : "main";
	return [
		{ name: "fraym-web", branch: "main", ahead: 3, behind: 0, dirty: 5, checkoutSha: "423d71d" },
		{
			name: "fraym-runtime",
			branch: "main",
			ahead: 0,
			behind: 0,
			dirty: 0,
			pin: { kind: "sync" },
			pinnedSha: "1fcfb0c",
			checkoutSha: "1fcfb0c",
		},
		{
			name: "fraym",
			branch: fraymBranch,
			ahead: 1,
			behind: 0,
			dirty: 2,
			pin: fraymPin,
			pinnedSha: "baa3d98",
			checkoutSha: fraymPin.kind === "sync" ? "baa3d98" : "e41c07a",
		},
		{
			name: "fraym-memory",
			branch: "main",
			ahead: 0,
			behind: 1,
			dirty: 0,
			pin: { kind: "sync" },
			pinnedSha: "77ab210",
			checkoutSha: "77ab210",
		},
	];
}

// ---------------------------------------------------------------------------
// Primitives — one row skin, one 8px grid, no leading icons.
// ---------------------------------------------------------------------------

const ROW_CLASS =
	"flex h-8 w-full items-center gap-2 rounded-[8px] px-2 text-left text-fr-sm outline-none transition-colors hover:bg-fr-surface-2 focus-visible:bg-fr-surface-2";

function Hairline() {
	return <div className="mx-2 my-1 border-t border-fr-border-soft" />;
}

/** DESIGN.md chip spec: surface-3 fill, mono caption, rounded.sm — on the
 *  shared Badge metrics (fixed h-5 + leading-none) so chip glyphs sit on the
 *  exact row axis next to the larger label text (mirrors the production panel). */
function Chip({ children, tone }: { readonly children: ReactNode; readonly tone?: "warn" | "del" | "add" }) {
	return (
		<Badge
			variant="soft"
			tone="mute"
			className={cn(
				"rounded-[6px] px-1.5 tabular-nums",
				tone === "warn"
					? "text-fr-warn"
					: tone === "del"
						? "text-fr-del"
						: tone === "add"
							? "text-fr-add"
							: "text-fr-text-2",
			)}
		>
			{children}
		</Badge>
	);
}

// ---------------------------------------------------------------------------
// This session — REDESIGN MOCK (session-vs-branch pipeline).
//
// The shipped grid ("Changed 7 / Committed 2 / Unpushed 0 / Pushed 2") mixed
// units (files vs commits), had no verdict, and led with an "unverified"
// badge. The redesign answers ONE question — "is this session's work landed?"
// — with a single verdict chip, then reads as a pipeline: uncommitted →
// committed → pushed. Attribution confidence becomes a human footnote.
// ---------------------------------------------------------------------------

interface SessionCommit {
	readonly sha: string;
	readonly subject: string;
	readonly pushed: boolean;
}

/** Mirrors SessionScmLedger confidence: worktree=exclusive, shared, degraded=inferred. */
type SessionAttribution = "own worktree" | "shared checkout" | "degraded";

interface SessionScmFixture {
	readonly touched: number;
	readonly uncommitted: readonly string[];
	readonly commits: readonly SessionCommit[];
}

const SESSION_SCM_STATES: Record<string, SessionScmFixture> = {
	"mid-work": {
		touched: 7,
		uncommitted: [
			"packages/ui/src/features/environment/environment-panel.tsx",
			"packages/driver/src/scm-ledger.ts",
			"CHANGELOG.md",
		],
		commits: [
			{ sha: "2bb52df", subject: "feat(session-rail): selectable classic/threaded rail style", pushed: true },
		],
	},
	"committed, unpushed": {
		touched: 5,
		uncommitted: [],
		commits: [
			{ sha: "690fbd9", subject: "docs(changelog): record the classic/threaded rail style", pushed: false },
			{ sha: "2bb52df", subject: "feat(session-rail): selectable classic/threaded rail style", pushed: true },
		],
	},
	"all pushed": {
		touched: 7,
		uncommitted: [],
		commits: [
			{ sha: "5697cc6", subject: "release(desktop): finalize 0.9.5 update feed", pushed: true },
			{ sha: "31e75e0", subject: "docs: refresh v0.9.5 release notes", pushed: true },
		],
	},
	"no changes": { touched: 0, uncommitted: [], commits: [] },
};

/** ONE verdict for the collapsed header: the work remaining, or the landing. */
function sessionVerdict(scm: SessionScmFixture): { readonly label: string; readonly tone?: "warn" | "add" } {
	if (scm.touched === 0 && scm.commits.length === 0) return { label: "no changes" };
	if (scm.uncommitted.length > 0) return { label: `${scm.uncommitted.length} to commit`, tone: "warn" };
	const unpushed = scm.commits.filter(commit => !commit.pushed).length;
	if (unpushed > 0) return { label: `${unpushed} to push`, tone: "warn" };
	return { label: "✓ all pushed", tone: "add" };
}

/** One pipeline stage: state dot + connector, title, unit-labelled meta, rows. */
function PipelineStage({
	tone,
	title,
	meta,
	last,
	children,
}: {
	readonly tone: "add" | "warn" | "idle";
	readonly title: string;
	readonly meta: string;
	readonly last?: boolean;
	readonly children?: ReactNode;
}) {
	return (
		<div className="relative pr-3 pb-1.5 pl-9">
			{!last && (
				<span aria-hidden="true" className="absolute top-[15px] -bottom-px left-[17px] w-px bg-fr-border-soft" />
			)}
			<span
				aria-hidden="true"
				className={cn(
					"absolute top-[6px] left-[14px] size-[7px] rounded-full",
					tone === "add"
						? "bg-fr-add"
						: tone === "warn"
							? "bg-fr-warn"
							: "border border-fr-border bg-fr-surface-3",
				)}
			/>
			<div className="flex items-baseline gap-2 text-fr-xs leading-5">
				<span className="font-medium text-fr-text-2">{title}</span>
				<span className="text-fr-2xs tabular-nums text-fr-text-3">{meta}</span>
			</div>
			{children}
		</div>
	);
}

const ATTRIBUTION_NOTE: Record<SessionAttribution, string> = {
	"own worktree": "Runs in its own worktree — attribution is exact.",
	"shared checkout": "Shared checkout — other sessions can edit the same files.",
	degraded: "Attribution approximate — git state was only partially observable.",
};

function SessionPipeline({
	scm,
	attribution,
}: {
	readonly scm: SessionScmFixture;
	readonly attribution: SessionAttribution;
}) {
	if (scm.touched === 0 && scm.commits.length === 0) {
		return (
			<p className="px-4 pt-0.5 pb-1 text-fr-2xs leading-4 text-fr-text-3">No files touched by this session yet.</p>
		);
	}
	const pushedCount = scm.commits.filter(commit => commit.pushed).length;
	const commitCount = scm.commits.length;
	return (
		<>
			<p className="px-4 pb-1.5 text-fr-2xs leading-4 text-fr-text-3">
				{scm.touched} file{scm.touched === 1 ? "" : "s"} touched by this session
			</p>
			<PipelineStage
				tone={scm.uncommitted.length > 0 ? "warn" : "add"}
				title="Uncommitted"
				meta={
					scm.uncommitted.length > 0
						? `${scm.uncommitted.length} file${scm.uncommitted.length === 1 ? "" : "s"}`
						: "none"
				}
			>
				{scm.uncommitted.slice(0, 4).map(path => (
					<div key={path} className="fr-overflow py-px text-fr-2xs leading-4 text-fr-text-2" title={path}>
						{path}
					</div>
				))}
			</PipelineStage>
			<PipelineStage
				tone={commitCount > 0 ? (pushedCount === commitCount ? "add" : "warn") : "idle"}
				title="Committed"
				meta={commitCount === 0 ? "none yet" : `${commitCount} commit${commitCount === 1 ? "" : "s"}`}
			>
				{scm.commits.slice(0, 4).map(commit => (
					<div key={commit.sha} className="flex items-center gap-2 py-px text-fr-2xs leading-4">
						<code className="shrink-0 font-secondary text-fr-text-3">{commit.sha}</code>
						<span className="min-w-0 flex-1 fr-overflow text-fr-text-2" title={commit.subject}>
							{commit.subject}
						</span>
						{commit.pushed ? (
							<Icon
								name="check"
								size={10}
								strokeWidth={2}
								className="shrink-0 text-fr-add"
								aria-label="Pushed"
							/>
						) : (
							<span className="shrink-0 text-fr-warn">unpushed</span>
						)}
					</div>
				))}
			</PipelineStage>
			<PipelineStage
				tone={commitCount > 0 && pushedCount === commitCount ? "add" : commitCount > 0 ? "warn" : "idle"}
				title="Pushed"
				meta={commitCount === 0 ? "—" : `${pushedCount} of ${commitCount} on origin`}
				last
			/>
			<p className="px-4 pt-1 text-fr-2xs leading-4 text-fr-text-3">{ATTRIBUTION_NOTE[attribution]}</p>
		</>
	);
}

function SectionRow({
	label,
	trailing,
	children,
	open,
	onToggle,
}: {
	readonly label: string;
	readonly trailing?: ReactNode;
	readonly children: ReactNode;
	readonly open: boolean;
	readonly onToggle: () => void;
}) {
	return (
		<div>
			<button type="button" className={ROW_CLASS} onClick={onToggle} aria-expanded={open}>
				<span className="min-w-0 flex-1 fr-overflow font-medium text-fr-text-2">{label}</span>
				{trailing != null && (
					<span className="flex shrink-0 items-center gap-1.5 text-fr-xs leading-none tabular-nums text-fr-text-3">
						{trailing}
					</span>
				)}
				<Icon
					name="caretD"
					size={11}
					strokeWidth={1.8}
					className={cn("shrink-0 text-fr-text-3 transition-transform duration-200", !open && "-rotate-90")}
					aria-hidden="true"
				/>
			</button>
			{open && <div className="flex flex-col pb-1.5">{children}</div>}
		</div>
	);
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

/**
 * Typographic header — no box. The branch is a CONTROL, not a display: it
 * opens the branch picker (search · switch · create), like the Codex popover.
 */
function Header({
	isWorktree,
	branch,
	pickerOpen,
	onBranchClick,
}: {
	readonly isWorktree: boolean;
	readonly branch: string;
	readonly pickerOpen: boolean;
	readonly onBranchClick: () => void;
}) {
	return (
		<div className="px-2 pt-1.5 pb-2">
			<div className="flex items-center gap-1.5">
				<Icon name="branch" size={13} strokeWidth={1.7} className="shrink-0 text-fr-text-3" aria-hidden="true" />
				<button
					type="button"
					onClick={onBranchClick}
					aria-expanded={pickerOpen}
					aria-haspopup="listbox"
					className="-mx-1 flex min-w-0 flex-1 items-center gap-1 rounded-[6px] px-1 py-0.5 text-left transition-colors hover:bg-fr-surface-2"
					title="Switch branch"
				>
					<BranchName name={branch} className="min-w-0 flex-1 text-fr-sm font-semibold text-fr-text" />
					<Icon name="caretD" size={10} strokeWidth={1.8} className="shrink-0 text-fr-text-3" aria-hidden="true" />
				</button>
				{isWorktree && <span className="shrink-0 text-fr-xs text-fr-text-3">2 ahead</span>}
				<button
					type="button"
					className="rounded p-1 text-fr-text-3 transition-colors hover:bg-fr-surface-2 hover:text-fr-text"
					aria-label="Refresh"
				>
					<Icon name="refresh" size={11} strokeWidth={1.6} aria-hidden="true" />
				</button>
			</div>
			<div
				className="fr-overflow pl-[18.5px] text-fr-xs text-fr-text-3"
				title={isWorktree ? "C:/workspace/fraym-worktrees/env-card-v2" : "C:/workspace/fraym"}
			>
				{isWorktree ? "worktree · C:/workspace/fraym-worktrees/env-card-v2" : "local · C:/workspace/fraym"}
			</div>
		</div>
	);
}

const PICKER_BRANCHES = [
	"main",
	"fraym/feature/env-card-v2",
	"fraym/feature/worktrees-v2-environment-card-rework",
	"fraym/fix/eval-cwd",
	"spike/scm-tree",
] as const;

/** Codex-style branch picker: search · switch (✓ current) · create. */
function BranchPicker({ current, onPick }: { readonly current: string; readonly onPick: (branch: string) => void }) {
	const [query, setQuery] = useState("");
	const branches = PICKER_BRANCHES.filter(name => name.toLowerCase().includes(query.toLowerCase()));
	return (
		<div
			className="absolute top-9 right-full z-10 mr-2 flex w-64 flex-col rounded-[12px] border border-fr-border bg-fr-surface p-1.5 shadow-[0_4px_18px_rgba(0,0,0,0.3)]"
			role="listbox"
			data-slot="branch-picker"
		>
			<div className="flex items-center gap-1.5 px-2 py-1">
				<Icon name="search" size={11} strokeWidth={1.7} className="shrink-0 text-fr-text-3" aria-hidden="true" />
				<input
					value={query}
					onChange={event => setQuery(event.target.value)}
					placeholder="Search branches"
					className="w-full bg-transparent text-fr-xs text-fr-text outline-none placeholder:text-fr-text-3"
				/>
			</div>
			<div className="mx-2 my-1 border-t border-fr-border-soft" />
			{branches.map(name => {
				const active = name === current;
				return (
					<button
						key={name}
						type="button"
						onClick={() => onPick(name)}
						className="flex w-full items-center gap-2 rounded-[8px] px-2 py-1 text-left transition-colors hover:bg-fr-surface-2"
						aria-selected={active}
						role="option"
					>
						<Icon
							name="branch"
							size={11}
							strokeWidth={1.7}
							className="shrink-0 text-fr-text-3"
							aria-hidden="true"
						/>
						<span className="flex min-w-0 flex-1 flex-col">
							<BranchName name={name} className="min-w-0 text-fr-xs text-fr-text-2" />
							{active && <span className="text-fr-2xs text-fr-text-3">Uncommitted: 5 files</span>}
						</span>
						{active && (
							<Icon
								name="check"
								size={11}
								strokeWidth={2}
								className="shrink-0 text-fr-text-2"
								aria-hidden="true"
							/>
						)}
					</button>
				);
			})}
			<div className="mx-2 my-1 border-t border-fr-border-soft" />
			<button
				type="button"
				className="flex w-full items-center gap-2 rounded-[8px] px-2 py-1 text-left text-fr-xs text-fr-text-2 transition-colors hover:bg-fr-surface-2"
			>
				<Icon name="plus" size={11} strokeWidth={1.8} className="shrink-0 text-fr-text-3" aria-hidden="true" />
				Create and checkout new branch…
			</button>
		</div>
	);
}

/** State-dependent prominence: quiet summary when healthy, escalation on drift. */
function ReposSection({ repos }: { readonly repos: readonly RepoRow[] }) {
	const troubled = repos.filter(repo => repo.pin && repo.pin.kind !== "sync");
	const [open, setOpen] = useState(false);
	const expanded = open || troubled.length > 0;
	const hasDrift = troubled.some(repo => repo.pin?.kind === "drift");
	const summary = troubled.length === 0 ? `${repos.length} in sync` : hasDrift ? "pin drift" : "bump pending";

	return (
		<SectionRow
			label="Repos"
			trailing={
				troubled.length === 0 ? <span>{summary}</span> : <Chip tone={hasDrift ? "del" : "warn"}>{summary}</Chip>
			}
			open={expanded}
			onToggle={() => setOpen(value => !value)}
		>
			{repos.map(repo => {
				const pin = repo.pin;
				const danger = pin?.kind === "drift";
				const warn = pin?.kind === "ahead";
				// Popular status vocabulary (Codex/GitHub Desktop): "Uncommitted: N files",
				// "N ahead", "N behind" — muted, on the branch line.
				const status = [
					repo.dirty > 0 && `Uncommitted: ${repo.dirty} file${repo.dirty === 1 ? "" : "s"}`,
					repo.ahead > 0 && `${repo.ahead} ahead`,
					repo.behind > 0 && `${repo.behind} behind`,
				]
					.filter(Boolean)
					.join(" · ");
				return (
					<div
						key={repo.name}
						className={cn("mx-2 rounded-[8px] px-2 py-1", danger && "border border-fr-del/30 bg-fr-del/5")}
					>
						<div className="flex items-center gap-2">
							<span
								className={cn(
									"min-w-0 fr-overflow text-fr-xs",
									repo.pin ? "text-fr-text-2" : "font-medium text-fr-text",
								)}
							>
								{repo.name}
							</span>
							<span className="min-w-0 flex-1" />
							{pin?.kind === "ahead" && <Chip tone="warn">pin +{pin.by}</Chip>}
							{pin?.kind === "drift" && <Chip tone="del">pin drift</Chip>}
						</div>
						<div className="flex items-baseline text-fr-xs leading-4 text-fr-text-3">
							<BranchName name={repo.branch} className="min-w-0" />
							{status && <span className="shrink-0 whitespace-pre">{` · ${status}`}</span>}
						</div>
						{(danger || warn) && repo.pinnedSha && (
							<div className="pt-0.5 pb-0.5 text-fr-2xs text-fr-text-3">
								pinned <code className="text-fr-text-2">{repo.pinnedSha}</code> · checkout{" "}
								<code className={danger ? "text-fr-del" : "text-fr-warn"}>{repo.checkoutSha}</code>
								{danger && <span className="text-fr-del">: does not descend, rebase onto the pin</span>}
							</div>
						)}
					</div>
				);
			})}
		</SectionRow>
	);
}

// ---------------------------------------------------------------------------
// The card
// ---------------------------------------------------------------------------

function EnvironmentCardMock({
	where,
	pinMode,
	longNames,
	scmState,
	attribution,
}: {
	readonly where: "local" | "worktree";
	readonly pinMode: "in sync" | "bump pending" | "drift";
	readonly longNames: boolean;
	readonly scmState: string;
	readonly attribution: SessionAttribution;
}) {
	const repos = repoFixture(pinMode, longNames);
	const worktrees = worktreeFixture(longNames);
	const defaultBranch =
		where === "worktree"
			? longNames
				? "fraym/feature/worktrees-v2-environment-card-rework"
				: "fraym/feature/env-card-v2"
			: "main";
	const isWorktree = where === "worktree";
	const [openSection, setOpenSection] = useState<string | null>("session");
	const sessionScm = SESSION_SCM_STATES[scmState] ?? SESSION_SCM_STATES["mid-work"]!;
	const verdict = sessionVerdict(sessionScm);
	const toggle = (id: string) => setOpenSection(value => (value === id ? null : id));
	// The branch is switchable (mock-local): picking updates the header.
	const [pickedBranch, setPickedBranch] = useState<string | null>(null);
	const [pickerOpen, setPickerOpen] = useState(false);
	const branch = pickedBranch ?? defaultBranch;

	return (
		<div
			className="relative flex w-72 flex-col rounded-[14px] border border-fr-border bg-fr-surface p-1.5 shadow-[0_2px_10px_rgba(0,0,0,0.18)]"
			data-slot="environment-card"
		>
			<Header
				isWorktree={isWorktree}
				branch={branch}
				pickerOpen={pickerOpen}
				onBranchClick={() => setPickerOpen(value => !value)}
			/>
			{pickerOpen && (
				<BranchPicker
					current={branch}
					onPick={name => {
						setPickedBranch(name);
						setPickerOpen(false);
					}}
				/>
			)}
			<Hairline />

			{/* This session — REDESIGN: one verdict chip, then the pipeline. */}
			<SectionRow
				label="This session"
				trailing={<Chip tone={verdict.tone}>{verdict.label}</Chip>}
				open={openSection === "session"}
				onToggle={() => toggle("session")}
			>
				<SessionPipeline scm={sessionScm} attribution={attribution} />
			</SectionRow>

			{/* Changes NAVIGATES to the Diff dock (single source of truth for diffs). */}
			<button type="button" className={ROW_CLASS} title="Open the Diff dock">
				<span className="min-w-0 flex-1 fr-overflow font-medium text-fr-text-2">Changes</span>
				<span className="flex shrink-0 items-center gap-1.5 text-fr-xs tabular-nums">
					<span className="text-fr-add">+126</span>
					<span className="text-fr-del">−31</span>
				</span>
				<Icon name="caretR" size={11} strokeWidth={1.8} className="shrink-0 text-fr-text-3" aria-hidden="true" />
			</button>

			<ReposSection repos={repos} />

			<SectionRow
				label="Worktrees"
				trailing={<span>{worktrees.length}</span>}
				open={openSection === "worktrees"}
				onToggle={() => toggle("worktrees")}
			>
				{worktrees.map(tree => (
					<div key={tree.path} className="mx-2 rounded-[8px] px-2 py-1 text-fr-xs">
						<div className="flex items-center gap-2">
							<BranchName
								name={tree.branch}
								className={cn("min-w-0 flex-1", tree.here ? "text-fr-text" : "text-fr-text-2")}
							/>
							<span className="shrink-0 text-fr-text-3">{tree.here ? "here" : tree.kind}</span>
						</div>
						<div className="fr-overflow text-fr-2xs leading-4 text-fr-text-3" title={tree.path}>
							{tree.path.replace("C:/workspace", "~")}
						</div>
					</div>
				))}
			</SectionRow>

			<SectionRow
				label="Servers"
				trailing={<span>{SERVERS.length}</span>}
				open={openSection === "servers"}
				onToggle={() => toggle("servers")}
			>
				{SERVERS.map(server => (
					<div key={server.port} className="mx-2 flex h-8 items-center gap-2 px-2 text-fr-xs">
						<span className="size-1.5 shrink-0 rounded-full bg-fr-add" aria-label="Running" />
						<span className="flex min-w-0 flex-1 flex-col justify-center">
							<span className="fr-overflow leading-4 text-fr-text-2">{server.name}</span>
							<span className="fr-overflow text-fr-2xs leading-3.5 text-fr-text-3">
								fraym.test:{server.port} · {server.cwd}
							</span>
						</span>
						<button
							type="button"
							className="rounded-[6px] p-1 text-fr-text-3 transition-colors hover:bg-fr-surface-2 hover:text-fr-del"
							aria-label={`Stop ${server.name}`}
						>
							<Icon name="square" size={8} filled aria-hidden="true" />
						</button>
					</div>
				))}
			</SectionRow>

			<SectionRow label="Recap" open={openSection === "recap"} onToggle={() => toggle("recap")}>
				<p className="mx-2 px-2 pt-0.5 text-fr-xs leading-5 text-fr-text-3">
					Worktrees v2 shipped end to end: lifecycle verbs, rail badges, and this environment card. Next up is the
					scmRepoTree engine primitive, then live E2E with an induced pin drift.
				</p>
			</SectionRow>

			<Hairline />

			{/* Footer — dialog convention: quiet meta left, ONE primary right. */}
			<div className="flex items-center gap-1 px-1 pt-0.5 pb-0.5">
				<button
					type="button"
					className="rounded-[8px] p-1.5 text-fr-text-3 transition-colors hover:bg-fr-surface-2 hover:text-fr-text-2"
					title="Open fraym/fraym-web on GitHub"
					aria-label="Open repository on GitHub"
				>
					<Icon name="markGithub" size={12} filled viewBox="0 0 16 16" aria-hidden="true" />
				</button>
				<button
					type="button"
					className="rounded-[8px] p-1.5 text-fr-text-3 transition-colors hover:bg-fr-surface-2 hover:text-fr-text-2"
					title="Open in VS Code"
					aria-label="Open in VS Code"
				>
					<Icon name="cursor" size={12} strokeWidth={1.6} aria-hidden="true" />
				</button>
				<span className="flex-1" />
				{isWorktree ? (
					<>
						<button
							type="button"
							className="whitespace-nowrap rounded-[8px] px-2 py-1 text-fr-xs text-fr-text-2 transition-colors hover:bg-fr-surface-2 hover:text-fr-text active:scale-[0.98]"
						>
							Sync
						</button>
						<button
							type="button"
							className="flex items-center gap-1 whitespace-nowrap rounded-[8px] border border-fr-border bg-fr-surface-2 px-2.5 py-1 text-fr-xs font-medium text-fr-text transition-colors hover:bg-fr-surface-3 active:scale-[0.98]"
						>
							Finish · Merge
							<Icon name="caretD" size={10} strokeWidth={2} aria-hidden="true" />
						</button>
					</>
				) : (
					<>
						<button
							type="button"
							className="whitespace-nowrap rounded-[8px] px-2 py-1 text-fr-xs text-fr-text-2 transition-colors hover:bg-fr-surface-2 hover:text-fr-text active:scale-[0.98]"
						>
							Push
						</button>
						<button
							type="button"
							className="whitespace-nowrap rounded-[8px] border border-fr-border bg-fr-surface-2 px-2.5 py-1 text-fr-xs font-medium text-fr-text transition-colors hover:bg-fr-surface-3 active:scale-[0.98]"
						>
							Move to worktree
						</button>
					</>
				)}
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Showcase entry
// ---------------------------------------------------------------------------

const ENVIRONMENT_CARD_CONFIG: ControlsSchema = {
	where: { kind: "select", label: "session runs in", options: ["worktree", "local"], default: "worktree" },
	longNames: { kind: "boolean", label: "long branch names", default: false },
	pin: {
		kind: "select",
		label: "fraym pin state",
		options: ["in sync", "bump pending", "drift"],
		default: "in sync",
	},
	scm: {
		kind: "select",
		label: "session scm state",
		options: ["mid-work", "committed, unpushed", "all pushed", "no changes"],
		default: "mid-work",
	},
	attribution: {
		kind: "select",
		label: "attribution",
		options: ["shared checkout", "own worktree", "degraded"],
		default: "shared checkout",
	},
};

function EnvironmentCardEntry() {
	const { values, panel } = useControls(ENVIRONMENT_CARD_CONFIG);
	return (
		<Demo
			summary="Environment card — DESIGN MOCK v4 (fixture data, approval gate before implementation). Ledger layout: typographic header (branch + location truth), navigation row into the Diff dock, state-dependent Repos (quiet when healthy, escalated on pin drift), and a dialog-style footer with one context-dependent primary action. The Repos section is the part no other agent product has: superproject + submodules with branch, ahead/behind, dirty count, and pin status vs the recorded gitlink."
			importPath="design mock — target: @fraym/ui features/environment"
			controls={panel}
			stage="stretch"
		>
			<div className="flex items-start justify-center py-4">
				<EnvironmentCardMock
					where={values.where as "local" | "worktree"}
					pinMode={values.pin as "in sync" | "bump pending" | "drift"}
					longNames={values.longNames === true}
					scmState={values.scm as string}
					attribution={values.attribution as SessionAttribution}
				/>
			</div>
			<Note>
				"This session" REDESIGN: one verdict chip (N to commit / N to push / ✓ all pushed) instead of the shipped
				"changed + unverified" chip pair; body reads as a pipeline (uncommitted → committed → pushed) with units
				named, and attribution is a human footnote. Flip "session scm state" + "attribution" to tour it. Also: flip
				"fraym pin state" for the Repos escalation states.
			</Note>
		</Demo>
	);
}

const environmentCardDocs: EntryDocs = {
	import: "design mock — not yet exported from @fraym/ui",
	anatomy: [
		"// Card anatomy (v4 ledger):",
		"// ┌──────────────────────────────────────┐",
		"// │ ⑂ fraym/feature/env-card-v2    ↑2  ⟳  │  typographic header, no box",
		"// │   worktree · ~/fraym-worktrees/…     │  location truth",
		"// │ ─────────────────────────────────────│",
		"// │ Changes                    +126 −31 › │  navigates to the Diff dock",
		"// │ Repos                     4 in sync ⌄ │  quiet when healthy…",
		"// │ Repos                    [pin drift] ⌄│  …auto-opened + escalated on danger",
		"// │ Worktrees 3 ⌄ · Servers 2 ⌄           │",
		"// │ ─────────────────────────────────────│",
		"// │ ⌂ fraym-web · VS Code  [Sync][Finish] │  footer: meta left, ONE primary right",
		"// └──────────────────────────────────────┘",
		"//",
		"// Pin chip semantics (checkout vs recorded gitlink):",
		"//   ✓ in sync · [pin +N] descends, bump pending · [pin drift] NOT a descendant",
	].join("\n"),
	examples: [
		{ label: "Healthy", code: "Repos · 4 in sync — one quiet row, expands on demand" },
		{ label: "Bump pending", code: "warn chip [bump pending]; row shows pinned vs checkout SHAs" },
		{
			label: "Drift (danger)",
			code: "auto-opened, del-hairline row + remediation hint — committing would clobber sibling commits",
		},
	],
	api: [
		{
			name: "scmRepoTree (planned)",
			type: "engine primitive",
			description:
				"git submodule status --recursive + per-repo branch/ahead/behind/dirty + gitlink ancestry compare; surfaced over ACP like scmSnapshot.",
		},
	],
};

export const environmentCardEntries: readonly ShowcaseEntry[] = [
	{
		id: "environment-card",
		name: "Environment Card",
		Component: EnvironmentCardEntry,
		config: ENVIRONMENT_CARD_CONFIG,
		docs: environmentCardDocs,
	},
];
