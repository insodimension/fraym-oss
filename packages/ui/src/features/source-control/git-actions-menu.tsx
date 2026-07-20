"use client";

// GitActionsMenu — the branch chip + stacked-action dropdown (Commit and Push /
// Commit / Pull / Push / Create PR / Create Branch). Three views share the panel:
// the actions list, a branch picker (lists branches, checks one out), and an
// inline "new branch" field. Built from the shared Popover primitives; fr-tokens
// + proper git icons only — no browser prompts.

import { useState } from "react";
import { Button } from "../../elements";
import { PopoverDivider, PopoverHeading, PopoverPanel, PopoverRow, Scrim } from "../../elements/popover";
import { Icon } from "../../icons/icon";
import { cn } from "../../lib/cn";
import type { ScmBranch } from "./scm-types";

export interface GitActionsMenuProps {
	readonly branch: string | null;
	readonly ahead?: number;
	readonly behind?: number;
	/** Branches to offer in the picker (from `scmBranchList`). */
	readonly branches?: readonly ScmBranch[];
	/** Check out a branch by name. */
	readonly onCheckout?: (name: string) => void;
	readonly onCommitAndPush?: () => void;
	readonly onCommit?: () => void;
	readonly onPull?: () => void;
	readonly onPush?: () => void;
	readonly onCreatePr?: () => void;
	/** Create (and switch to) a new branch by name. */
	readonly onCreateBranch?: (name: string) => void;
	readonly className?: string;
}

type MenuView = "actions" | "branches" | "create";

const INPUT_CLASS =
	"w-full rounded-[7px] border border-fr-border bg-fr-surface-2 px-2.5 py-1.5 font-primary text-fr-sm text-fr-text placeholder:text-fr-text-3 focus-visible:border-fr-accent-line focus-visible:outline-none";

export function GitActionsMenu({
	branch,
	ahead = 0,
	behind = 0,
	branches = [],
	onCheckout,
	onCommitAndPush,
	onCommit,
	onPull,
	onPush,
	onCreatePr,
	onCreateBranch,
	className,
}: GitActionsMenuProps) {
	const [rect, setRect] = useState<DOMRect | null>(null);
	const [view, setView] = useState<MenuView>("actions");
	const [newBranch, setNewBranch] = useState("");

	const open = (event: React.MouseEvent<HTMLButtonElement>) => {
		setView("actions");
		setNewBranch("");
		setRect(event.currentTarget.getBoundingClientRect());
	};
	const close = () => {
		setRect(null);
		setView("actions");
		setNewBranch("");
	};
	const run = (action?: () => void) => {
		close();
		action?.();
	};
	const goCreate = () => {
		const name = newBranch.trim();
		if (name) run(() => onCreateBranch?.(name));
	};

	return (
		<>
			<button
				type="button"
				onClick={event => (rect ? close() : open(event))}
				className={cn(
					"flex items-center gap-1.5 rounded-[7px] border border-fr-border bg-fr-surface px-2 py-1 font-secondary text-fr-sm text-fr-text-2 transition-[color,background-color,transform] duration-[var(--fr-motion-fast)] hover:bg-fr-surface-2 hover:text-fr-text active:scale-[0.97]",
					className,
				)}
			>
				<Icon name="git-branch" size={13} strokeWidth={1.8} className="text-fr-text-2" />
				<span className="max-w-[140px] fr-overflow text-fr-text">{branch ?? "detached"}</span>
				<Icon name="caretD" size={12} strokeWidth={2} className="text-fr-text-3" />
			</button>
			{rect && (
				<>
					<Scrim onClick={close} />
					<PopoverPanel anchorRect={rect} place="below" width={248}>
						{view === "actions" && (
							<>
								<PopoverRow
									icon={<Icon name="git-branch" size={14} strokeWidth={1.8} />}
									label={branch ?? "detached"}
									chevron
									onClick={() => setView("branches")}
								/>
								<PopoverRow
									icon={<Icon name="upload" size={14} strokeWidth={1.8} />}
									label="Commit and Push"
									chevron
									onClick={() => run(onCommitAndPush)}
								/>
								<PopoverDivider />
								<PopoverHeading>Git actions</PopoverHeading>
								<PopoverRow
									icon={<Icon name="check" size={14} strokeWidth={1.9} />}
									label="Commit"
									onClick={() => run(onCommit)}
								/>
								<PopoverRow
									icon={<Icon name="download" size={14} strokeWidth={1.8} />}
									label="Pull"
									value={behind > 0 ? `↓${behind}` : undefined}
									onClick={() => run(onPull)}
								/>
								<PopoverRow
									icon={<Icon name="upload" size={14} strokeWidth={1.8} />}
									label="Push"
									value={ahead > 0 ? `↑${ahead}` : undefined}
									onClick={() => run(onPush)}
								/>
								<PopoverRow
									icon={<Icon name="external" size={14} strokeWidth={1.8} />}
									label="Create PR"
									onClick={() => run(onCreatePr)}
								/>
								<PopoverRow
									icon={<Icon name="git-branch" size={14} strokeWidth={1.8} />}
									label="Create Branch"
									onClick={() => setView("create")}
								/>
							</>
						)}
						{view === "branches" && (
							<>
								<PopoverRow
									icon={<Icon name="back" size={14} strokeWidth={1.9} />}
									label="Branches"
									onClick={() => setView("actions")}
								/>
								<PopoverDivider />
								<div className="max-h-[280px] overflow-y-auto">
									{branches.length === 0 ? (
										<PopoverHeading>No branches</PopoverHeading>
									) : (
										branches.map(b => (
											<PopoverRow
												key={b.name}
												icon={
													b.current ? (
														<Icon name="check" size={14} strokeWidth={2} className="text-fr-accent" />
													) : (
														<Icon name="git-branch" size={14} strokeWidth={1.8} />
													)
												}
												label={b.name}
												selected={b.current}
												onClick={() => (b.current ? close() : run(() => onCheckout?.(b.name)))}
											/>
										))
									)}
								</div>
							</>
						)}
						{view === "create" && (
							<>
								<PopoverRow
									icon={<Icon name="back" size={14} strokeWidth={1.9} />}
									label="New branch"
									onClick={() => setView("actions")}
								/>
								<PopoverDivider />
								<div className="flex flex-col gap-2 p-2">
									<input
										autoFocus
										value={newBranch}
										onChange={event => setNewBranch(event.target.value)}
										onKeyDown={event => {
											if (event.key === "Enter") {
												event.preventDefault();
												goCreate();
											} else if (event.key === "Escape") {
												event.preventDefault();
												setView("actions");
											}
										}}
										placeholder="feature/my-branch"
										spellCheck={false}
										autoComplete="off"
										className={INPUT_CLASS}
									/>
									<Button
										variant="default"
										size="sm"
										disabled={newBranch.trim().length === 0}
										onClick={goCreate}
										className="w-full"
									>
										<Icon name="git-branch" size={13} strokeWidth={1.9} />
										Create branch
									</Button>
								</div>
							</>
						)}
					</PopoverPanel>
				</>
			)}
		</>
	);
}
