// ProviderAccountSwitcher — generic multi-account credential control for ANY
// provider with 2+ signed-in accounts. Three real, distinct modes, driven by
// engine-reported state:
//   - Pinned:            exactly one account, ever, even past its rate limit.
//   - Priority fallback: an ordered chain — P0 until blocked, then P1, ...
//   - Balanced:          the engine auto-picks per new session by headroom.
// Pin, policy, and priority-order are three separate calls — each mutation
// reaches the engine as exactly what it is, never encoded into a shared
// "account key" string.
//
// Every mutation is optimistic: a click or drop updates the local view
// instantly and fires the callback; the optimistic value self-invalidates
// the moment the real snapshot it was based on changes (success ⇒ the fresh
// truth already matches, so nothing visibly moves; anything else ⇒ we snap
// back to truth). This is the same fingerprint-guarded draft pattern most of
// the surface already uses for in-flight edits — it can't drift permanently
// because it's always compared against the CURRENT baseline, not a stale one.

import type {
	EngineProviderAccountDiagnostics,
	EngineProviderAccountRecord,
	EngineProviderAccountSelectionPolicy,
	EngineProviderRecord,
} from "@fraym-ai/driver";
import { type DragEventHandler, useState } from "react";
import { Badge } from "../elements/badge";
import { cn } from "../lib/cn";
import { type MarketplaceFilter, MarketplaceFilterPills } from "./filter-pills";

export interface ProviderAccountSwitcherProps {
	readonly provider?: EngineProviderRecord | null;
	readonly loading?: boolean;
	/** Pin a specific signed-in account as the active credential; `null` unpins. */
	readonly onPinAccount?: (providerId: string, accountKey: string | null) => void;
	/** Set the multi-account selection policy (weighted / priority-fallback). */
	readonly onSetAccountPolicy?: (providerId: string, policy: EngineProviderAccountSelectionPolicy) => void;
	/** Reorder the priority-fallback chain. */
	readonly onSetAccountPriorityOrder?: (providerId: string, order: readonly string[]) => void;
	/** When provided, each usable real account row gets a per-account "Sign out" control. */
	readonly onRemoveAccount?: (providerId: string, accountKey: string) => void;
	/** When provided, auth-failed account rows get a "Sign in again" control. */
	readonly onReconnectAccount?: (providerId: string, accountKey: string) => void;
	readonly className?: string;
}

// --- diagnostics presentation (unchanged: provider-agnostic health display) -

function diagnosticsTone(diagnostics: EngineProviderAccountDiagnostics | undefined): "add" | "warn" | "del" | "mute" {
	switch (diagnostics?.state) {
		case "healthy":
			return "add";
		case "rate_limited":
		case "overloaded":
			return "warn";
		case "auth_failed":
		case "unavailable":
			return "del";
		default:
			return "mute";
	}
}

function diagnosticsLabel(diagnostics: EngineProviderAccountDiagnostics | undefined): string | undefined {
	switch (diagnostics?.state) {
		case "healthy":
			return "Healthy";
		case "rate_limited":
			return "Rate limited";
		case "overloaded":
			return "Overloaded";
		case "auth_failed":
			return "Auth failed";
		case "unavailable":
			return "Unavailable";
		case "unknown":
			return "Unknown";
		default:
			return undefined;
	}
}

function formatPercent(fraction: number | undefined): string | undefined {
	return typeof fraction === "number" ? `${Math.round(fraction * 100)}%` : undefined;
}

function diagnosticsSummary(diagnostics: EngineProviderAccountDiagnostics | undefined): string | undefined {
	const limits = diagnostics?.limits?.slice(0, 2) ?? [];
	if (limits.length === 0) return undefined;
	return limits
		.map(limit => {
			const used = formatPercent(limit.usedFraction);
			return used ? `${limit.label} ${used} used` : undefined;
		})
		.filter((part): part is string => Boolean(part))
		.join(" · ");
}

const BALANCED_POLICY_TITLE =
	"Balanced: keep all enabled and pick new sessions by usage headroom, with failover if an account is unavailable.";
const PRIORITY_FALLBACK_TITLE =
	"Priority fallback: use P0 first until it is blocked, rate-limited, or exhausted, then fall to P1/P2 and return to P0 after reset.";
const PINNED_MODE_TITLE = "Pinned: only this one account is ever used, even past its rate limit — no fallback.";

const ROUTING_POLICY_OPTIONS: ReadonlyArray<MarketplaceFilter<EngineProviderAccountSelectionPolicy>> = [
	{ id: "weighted", label: "Balanced", title: BALANCED_POLICY_TITLE },
	{ id: "priority-fallback", label: "Priority fallback", title: PRIORITY_FALLBACK_TITLE },
];

function priorityOrder(accounts: readonly EngineProviderAccountRecord[]): readonly EngineProviderAccountRecord[] {
	return [...accounts].sort(
		(left, right) => (left.priority ?? Number.MAX_SAFE_INTEGER) - (right.priority ?? Number.MAX_SAFE_INTEGER),
	);
}

/** Live drag preview: slot `draggedKey` into `overKey`'s position. Pure — called
 * every render, never mutates the base order. */
function withDragPreview(
	order: readonly EngineProviderAccountRecord[],
	draggedKey: string | null,
	overKey: string | null,
): readonly EngineProviderAccountRecord[] {
	if (!draggedKey || !overKey || draggedKey === overKey) return order;
	const fromIndex = order.findIndex(account => account.key === draggedKey);
	const toIndex = order.findIndex(account => account.key === overKey);
	if (fromIndex === -1 || toIndex === -1) return order;
	const next = [...order];
	const [item] = next.splice(fromIndex, 1);
	if (!item) return order;
	next.splice(toIndex, 0, item);
	return next;
}

// --- account row primitives ---------------------------------------------

interface AccountOptionProps {
	readonly diagnostics?: EngineProviderAccountDiagnostics;
	readonly inferAuthFailed?: boolean;
	readonly accountKey: string;
	readonly label: string;
	readonly hint: string;
	readonly selected: boolean;
	readonly selectable: boolean;
	readonly onReconnect?: () => void;
	readonly loading: boolean;
	readonly onSelect: () => void;
	readonly onRemove?: () => void;
	readonly priorityIndex?: number;
	readonly dragging?: boolean;
	readonly dropTarget?: boolean;
	readonly onDragStart?: () => void;
	readonly onDragOver?: () => void;
	readonly onDrop?: () => void;
	readonly onDragEnd?: () => void;
}

interface AccountAction {
	readonly label: string;
	readonly title: string;
	readonly slot: "account-reconnect" | "account-remove";
	readonly tone: "accent" | "del";
	readonly handler: () => void;
}

function inferDiagnostics(
	diagnostics: EngineProviderAccountDiagnostics | undefined,
	inferAuthFailed: boolean | undefined,
): EngineProviderAccountDiagnostics | undefined {
	if (diagnostics || !inferAuthFailed) return diagnostics;
	return {
		state: "auth_failed",
		checkedAt: Date.now(),
		reason: "Stored account is not currently usable; sign in again.",
	};
}

/** Only ever invoked when `statusLabel` (the caller's `??` left side) was
 * undefined — `loading` is the only signal left to distinguish "still
 * fetching" from "checked, nothing to report". */
function fallbackStatusLabel(loading: boolean): string | undefined {
	return loading ? undefined : "Unknown";
}

function accountAction(
	isAuthFailed: boolean,
	onReconnect: (() => void) | undefined,
	onRemove: (() => void) | undefined,
): AccountAction | undefined {
	if (isAuthFailed && onReconnect) {
		return {
			label: "Sign in again",
			title: "Sign in again",
			slot: "account-reconnect",
			tone: "accent",
			handler: onReconnect,
		};
	}
	if (!onRemove) return undefined;
	return { label: "Sign out", title: "Sign out", slot: "account-remove", tone: "del", handler: onRemove };
}

interface AccountSelectButtonProps {
	readonly label: string;
	readonly hint: string;
	readonly selected: boolean;
	readonly selectable: boolean;
	readonly loading: boolean;
	readonly onSelect: () => void;
	readonly visibleStatusLabel?: string;
	readonly statusTone: "add" | "warn" | "del" | "mute";
	readonly summary?: string;
	readonly reason?: string;
}

function AccountSelectButton({
	label,
	hint,
	selected,
	selectable,
	loading,
	onSelect,
	visibleStatusLabel,
	statusTone,
	summary,
	reason,
}: AccountSelectButtonProps) {
	const interactive = selectable && !selected;
	return (
		<button
			type="button"
			role={selectable ? "radio" : undefined}
			aria-checked={selectable ? selected : undefined}
			data-slot="account-select"
			disabled={loading || !interactive}
			onClick={() => {
				if (interactive) onSelect();
			}}
			className={cn(
				"flex min-w-0 flex-1 items-center gap-3 rounded-l-[10px] px-3 py-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fr-accent-line disabled:opacity-50",
				interactive && "cursor-pointer",
				!selectable && "disabled:opacity-100",
			)}
		>
			{selectable && (
				<span
					aria-hidden="true"
					className={cn(
						"grid size-[15px] shrink-0 place-items-center rounded-full border",
						selected ? "border-fr-accent" : "border-fr-border",
					)}
				>
					{selected && <span className="size-[7px] rounded-full bg-fr-accent" />}
				</span>
			)}
			<span className="min-w-0 flex-1">
				<span className="mb-0.5 flex min-w-0 flex-wrap items-center gap-1.5">
					<span className="fr-overflow text-fr-sm font-medium text-fr-text">{label}</span>
					{visibleStatusLabel && (
						<Badge variant="soft" tone={statusTone} className="shrink-0">
							{visibleStatusLabel}
						</Badge>
					)}
				</span>
				<span className="block fr-overflow text-xs text-fr-text-3">{hint}</span>
				{summary && (
					<span className="mt-0.5 block fr-overflow font-secondary text-fr-2xs text-fr-text-3">{summary}</span>
				)}
				{reason && <span className="mt-0.5 block fr-overflow text-xs text-fr-text-3">{reason}</span>}
			</span>
			{selected && (
				<Badge variant="soft" tone="accent" className="shrink-0">
					In use
				</Badge>
			)}
		</button>
	);
}

function AccountActionButton({
	action,
	label,
	loading,
}: {
	readonly action: AccountAction;
	readonly label: string;
	readonly loading: boolean;
}) {
	return (
		<button
			type="button"
			data-slot={action.slot}
			aria-label={`${action.title} ${label}`}
			title={action.title}
			disabled={loading}
			onClick={action.handler}
			className={cn(
				"shrink-0 rounded-r-[10px] px-3 text-xs text-fr-text-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fr-accent-line disabled:opacity-50",
				action.tone === "accent" ? "hover:text-fr-accent" : "hover:text-fr-del",
			)}
		>
			{action.label}
		</button>
	);
}

interface AccountOptionState {
	readonly action?: AccountAction;
	readonly inferredDiagnostics?: EngineProviderAccountDiagnostics;
	readonly visibleStatusLabel?: string;
	readonly statusTone: "add" | "warn" | "del" | "mute";
	readonly summary?: string;
}

function accountOptionState({
	diagnostics,
	inferAuthFailed,
	loading,
	onReconnect,
	onRemove,
}: Pick<
	AccountOptionProps,
	"diagnostics" | "inferAuthFailed" | "loading" | "onReconnect" | "onRemove"
>): AccountOptionState {
	const inferredDiagnostics = inferDiagnostics(diagnostics, inferAuthFailed);
	const statusLabel = diagnosticsLabel(inferredDiagnostics);
	return {
		action: accountAction(inferredDiagnostics?.state === "auth_failed", onReconnect, onRemove),
		inferredDiagnostics,
		visibleStatusLabel: statusLabel ?? fallbackStatusLabel(loading),
		statusTone: statusLabel ? diagnosticsTone(inferredDiagnostics) : "mute",
		summary: diagnosticsSummary(inferredDiagnostics),
	};
}

interface AccountDragInput {
	readonly accountKey: string;
	readonly priorityIndex?: number;
	readonly loading: boolean;
	readonly onDragStart?: () => void;
	readonly onDragOver?: () => void;
	readonly onDrop?: () => void;
	readonly onDragEnd?: () => void;
}

interface AccountDragProps {
	readonly draggable: boolean;
	readonly onDragStart: DragEventHandler<HTMLDivElement>;
	readonly onDragOver: DragEventHandler<HTMLDivElement>;
	readonly onDrop: DragEventHandler<HTMLDivElement>;
	readonly onDragEnd: DragEventHandler<HTMLDivElement>;
}

function accountDragProps({
	accountKey,
	priorityIndex,
	loading,
	onDragStart,
	onDragOver,
	onDrop,
	onDragEnd,
}: AccountDragInput): AccountDragProps {
	const enabled = priorityIndex !== undefined && !loading;
	return {
		draggable: enabled,
		onDragStart: event => {
			if (!enabled) return;
			// A custom drag image keeps the browser's default (often oversized,
			// screenshot-like) ghost from appearing — the row dims via `dragging`
			// instead, so the live-reorder preview below is what the eye tracks.
			event.dataTransfer.effectAllowed = "move";
			event.dataTransfer.setData("text/plain", accountKey);
			const empty = document.createElement("div");
			event.dataTransfer.setDragImage(empty, 0, 0);
			onDragStart?.();
		},
		onDragOver: event => {
			if (!enabled) return;
			event.preventDefault();
			event.dataTransfer.dropEffect = "move";
			onDragOver?.();
		},
		onDrop: event => {
			if (!enabled) return;
			event.preventDefault();
			onDrop?.();
		},
		onDragEnd: () => onDragEnd?.(),
	};
}

/** Six-dot grip glyph — the standard drag-handle affordance, no icon asset needed. */
function GripGlyph() {
	return (
		<span aria-hidden="true" className="grid grid-cols-2 gap-[3px]">
			{Array.from({ length: 6 }, (_, index) => (
				<span key={index} className="size-[3px] rounded-full bg-current" />
			))}
		</span>
	);
}

function AccountPriorityHandle({ priorityIndex }: { readonly priorityIndex?: number }) {
	if (priorityIndex === undefined) return null;
	return (
		<div
			className="flex shrink-0 cursor-grab items-center gap-1.5 pl-2.5 text-fr-text-3 active:cursor-grabbing"
			title="Drag to reorder account priority"
		>
			<GripGlyph />
			<Badge variant="soft" tone="accent" className="shrink-0">
				P{priorityIndex}
			</Badge>
		</div>
	);
}

function AccountOption({
	accountKey,
	label,
	hint,
	selected,
	selectable,
	diagnostics,
	inferAuthFailed,
	loading,
	onSelect,
	onReconnect,
	onRemove,
	priorityIndex,
	dragging,
	dropTarget,
	onDragStart,
	onDragOver,
	onDrop,
	onDragEnd,
}: AccountOptionProps) {
	const state = accountOptionState({ diagnostics, inferAuthFailed, loading, onReconnect, onRemove });
	const drag = accountDragProps({ accountKey, priorityIndex, loading, onDragStart, onDragOver, onDrop, onDragEnd });
	return (
		<div
			data-slot="provider-account-row"
			data-account-key={accountKey}
			data-active={selected ? "true" : "false"}
			draggable={drag.draggable}
			onDragStart={drag.onDragStart}
			onDragOver={drag.onDragOver}
			onDrop={drag.onDrop}
			onDragEnd={drag.onDragEnd}
			className={cn(
				"flex items-stretch gap-1 rounded-[10px] border transition-[color,background-color,border-color,opacity,transform] duration-150",
				dragging && "scale-[0.99] opacity-40",
				dropTarget && !dragging && "border-fr-accent-line",
				selected
					? "border-fr-accent-line bg-fr-accent-dim"
					: !dropTarget && "border-fr-border-soft bg-fr-surface hover:border-fr-border hover:bg-fr-surface-2",
			)}
		>
			<AccountPriorityHandle priorityIndex={priorityIndex} />
			<AccountSelectButton
				label={label}
				hint={hint}
				selected={selected}
				selectable={selectable}
				loading={loading}
				onSelect={onSelect}
				visibleStatusLabel={state.visibleStatusLabel}
				statusTone={state.statusTone}
				summary={state.summary}
				reason={state.inferredDiagnostics?.reason}
			/>
			{state.action && <AccountActionButton action={state.action} label={label} loading={loading} />}
		</div>
	);
}

// --- mode toggle (Pinned / Multiple accounts) ----------------------------

type AccountMode = "pinned" | "multi";

const ACCOUNT_MODE_OPTIONS: ReadonlyArray<MarketplaceFilter<AccountMode>> = [
	{ id: "pinned", label: "Pinned", title: PINNED_MODE_TITLE },
	{ id: "multi", label: "Multiple accounts", title: "Keep every enabled account eligible for routing." },
];

// --- account list ---------------------------------------------------------

interface AccountListProps {
	readonly provider: EngineProviderRecord;
	readonly accounts: readonly EngineProviderAccountRecord[];
	readonly orderedAccounts: readonly EngineProviderAccountRecord[];
	readonly mode: AccountMode;
	readonly policy: EngineProviderAccountSelectionPolicy;
	/** Optimistic pin target — may not yet be reflected in `account.pinned`. */
	readonly effectivePin: string | null;
	readonly loading: boolean;
	readonly draggedKey: string | null;
	readonly dragOverKey: string | null;
	readonly onPin: (accountKey: string) => void;
	readonly onRemoveAccount?: (providerId: string, accountKey: string) => void;
	readonly onReconnectAccount?: (providerId: string, accountKey: string) => void;
	readonly onDragStart: (accountKey: string) => void;
	readonly onDragOver: (accountKey: string) => void;
	readonly onDrop: () => void;
	readonly onDragEnd: () => void;
}

function AccountList({
	provider,
	accounts,
	orderedAccounts,
	mode,
	policy,
	effectivePin,
	loading,
	draggedKey,
	dragOverKey,
	onPin,
	onRemoveAccount,
	onReconnectAccount,
	onDragStart,
	onDragOver,
	onDrop,
	onDragEnd,
}: AccountListProps) {
	// Pinned mode: click any row to pin it — no drag, order is irrelevant.
	// Multi + priority-fallback: drag-only reorder — clicking never mutates
	// anything, only dragging does.
	// Multi + weighted: informational only — the engine picks automatically.
	const draggableInPriority = mode === "multi" && policy === "priority-fallback";
	return (
		<>
			{draggableInPriority && accounts.length > 1 && (
				<div className="px-1 text-fr-2xs text-fr-text-3">Drag account cards below to reorder priority.</div>
			)}
			{orderedAccounts.map((account, index) => {
				const inferAuthFailed =
					!provider.hasAuth && provider.oauthSupported && account.diagnostics?.state !== "auth_failed";
				const selectable = mode === "pinned";
				// "Selected" is an exclusive-choice affordance (accent border, "In use"
				// badge) — only meaningful for a pin (exactly one, ever) or the current
				// priority-fallback target (exactly one, until it's blocked). Under
				// weighted balancing `active` can be true for several accounts at once
				// (different concurrent sessions), so it stays a plain, unhighlighted row.
				const selected =
					mode === "pinned" ? account.key === effectivePin : draggableInPriority ? account.active : false;
				return (
					<AccountOption
						key={account.key}
						accountKey={account.key}
						label={account.label}
						hint={
							mode === "pinned"
								? "Only this account is ever used"
								: draggableInPriority
									? account.active
										? "Currently active"
										: "Falls back to this account"
									: "Eligible for automatic selection"
						}
						diagnostics={account.diagnostics}
						inferAuthFailed={inferAuthFailed}
						selected={selected}
						selectable={selectable}
						onReconnect={onReconnectAccount ? () => onReconnectAccount(provider.id, account.key) : undefined}
						loading={loading}
						onSelect={() => onPin(account.key)}
						onRemove={onRemoveAccount ? () => onRemoveAccount(provider.id, account.key) : undefined}
						priorityIndex={draggableInPriority ? index : undefined}
						dragging={draggedKey === account.key}
						dropTarget={draggableInPriority && draggedKey !== null && dragOverKey === account.key}
						onDragStart={() => onDragStart(account.key)}
						onDragOver={() => onDragOver(account.key)}
						onDrop={onDrop}
						onDragEnd={onDragEnd}
					/>
				);
			})}
		</>
	);
}

// --- root component --------------------------------------------------------

interface Draft<T> {
	readonly value: T;
	/** Fingerprint of the real state this draft was based on — the draft is
	 * trusted only while the live state still matches it. */
	readonly snapshotKey: string;
}

export function ProviderAccountSwitcher({
	provider,
	loading = false,
	onPinAccount,
	onSetAccountPolicy,
	onSetAccountPriorityOrder,
	onRemoveAccount,
	onReconnectAccount,
	className,
}: ProviderAccountSwitcherProps) {
	const [draftPin, setDraftPin] = useState<Draft<string | null> | null>(null);
	const [draftPolicy, setDraftPolicy] = useState<Draft<EngineProviderAccountSelectionPolicy> | null>(null);
	const [draftOrder, setDraftOrder] = useState<Draft<readonly string[]> | null>(null);
	const [draggedKey, setDraggedKey] = useState<string | null>(null);
	const [dragOverKey, setDragOverKey] = useState<string | null>(null);

	const accounts = provider?.accounts ?? [];
	if (!provider || !onPinAccount || !onSetAccountPolicy || !onSetAccountPriorityOrder || accounts.length === 0) {
		return null;
	}

	const pinSnapshotKey = accounts.map(account => `${account.key}:${account.pinned ? "1" : "0"}`).join("|");
	const policySnapshotKey = provider.accountSelectionPolicy ?? "weighted";
	const orderSnapshotKey = accounts.map(account => `${account.key}:${account.priority ?? ""}`).join("|");

	const effectivePin =
		draftPin?.snapshotKey === pinSnapshotKey
			? draftPin.value
			: (accounts.find(account => account.pinned)?.key ?? null);
	const mode: AccountMode = effectivePin ? "pinned" : "multi";
	const policy = draftPolicy?.snapshotKey === policySnapshotKey ? draftPolicy.value : policySnapshotKey;

	const persistedOrder = priorityOrder(accounts);
	const draftedOrder =
		draftOrder?.snapshotKey === orderSnapshotKey
			? (draftOrder.value
					.map(key => accounts.find(account => account.key === key))
					.filter((account): account is EngineProviderAccountRecord => account !== undefined)
					// Any account missing from the draft (e.g. one just added elsewhere)
					// still needs a slot — append it rather than dropping it silently.
					.concat(
						persistedOrder.filter(account => !draftOrder.value.includes(account.key)),
					) as readonly EngineProviderAccountRecord[])
			: persistedOrder;
	const orderedAccounts = withDragPreview(draftedOrder, draggedKey, dragOverKey);

	const commitOrder = (nextOrder: readonly EngineProviderAccountRecord[]) => {
		const nextKeys = nextOrder.map(account => account.key);
		setDraftOrder({ value: nextKeys, snapshotKey: orderSnapshotKey });
		onSetAccountPriorityOrder(provider.id, nextKeys);
	};

	return (
		<div
			data-slot="provider-account-switcher"
			aria-label={`${provider.name} active account`}
			className={cn("flex flex-col gap-2.5", className)}
		>
			{accounts.length > 1 && (
				<MarketplaceFilterPills<AccountMode>
					filters={ACCOUNT_MODE_OPTIONS}
					active={mode}
					disabled={loading}
					onChange={nextMode => {
						if (nextMode === mode) return;
						if (nextMode === "pinned") {
							const fallbackTarget = accounts.find(account => account.active) ?? orderedAccounts[0];
							if (!fallbackTarget) return;
							setDraftPin({ value: fallbackTarget.key, snapshotKey: pinSnapshotKey });
							onPinAccount(provider.id, fallbackTarget.key);
						} else {
							setDraftPin({ value: null, snapshotKey: pinSnapshotKey });
							onPinAccount(provider.id, null);
						}
					}}
				/>
			)}
			{mode === "multi" && accounts.length > 1 && (
				<MarketplaceFilterPills<EngineProviderAccountSelectionPolicy>
					filters={ROUTING_POLICY_OPTIONS}
					active={policy}
					disabled={loading}
					onChange={nextPolicy => {
						if (nextPolicy === policy) return;
						setDraftPolicy({ value: nextPolicy, snapshotKey: policySnapshotKey });
						onSetAccountPolicy(provider.id, nextPolicy);
					}}
				/>
			)}
			<div
				className="flex flex-col gap-1"
				role={mode === "pinned" ? "radiogroup" : undefined}
				aria-label={mode === "pinned" ? `${provider.name} pinned account` : undefined}
			>
				<AccountList
					provider={provider}
					accounts={accounts}
					orderedAccounts={orderedAccounts}
					mode={mode}
					policy={policy}
					effectivePin={effectivePin}
					loading={loading}
					draggedKey={draggedKey}
					dragOverKey={dragOverKey}
					onPin={accountKey => {
						setDraftPin({ value: accountKey, snapshotKey: pinSnapshotKey });
						onPinAccount(provider.id, accountKey);
					}}
					onRemoveAccount={onRemoveAccount}
					onReconnectAccount={onReconnectAccount}
					onDragStart={setDraggedKey}
					onDragOver={key => {
						if (key !== dragOverKey) setDragOverKey(key);
					}}
					onDrop={() => {
						if (draggedKey && dragOverKey && draggedKey !== dragOverKey) commitOrder(orderedAccounts);
						setDraggedKey(null);
						setDragOverKey(null);
					}}
					onDragEnd={() => {
						setDraggedKey(null);
						setDragOverKey(null);
					}}
				/>
			</div>
		</div>
	);
}
