// Feature lifecycle registry.
//
// A small, CLOSED set of Engine features report state changes as one-way "presentations"
// — append a notice, flip a transcript divider, set a flag. Instead of a bespoke
// handler per event, each feature declares a presenter per phase (start/update/end)
// in FEATURES; the generic reducer (`reduceFeatureEvent`) applies every presentation
// the same way. Adding a lifecycle feature is one FEATURES row + one route below.
//
// This is deliberately NOT where pure state-slice writes live (workingStatus,
// contextUsage, tasks, planMode, goal, thinkingLevel, the host-UI queue). Those are
// typed reads consumed by dedicated surfaces and stay in `reduceStatusEvent`.

import type { SessionState, SessionStateAction, SessionTranscriptMessage } from "./session-types";

type SessionEventOf<T extends SessionStateAction["type"]> = Extract<SessionStateAction, { readonly type: T }>;
type Notice = SessionState["notices"][number];
type Phase = "start" | "update" | "end";
type PhasePresenter = (event: SessionStateAction, state: SessionState) => Presentation;

/**
 * A feature's contribution to session state for one phase. A presenter returns
 * *what* to surface; `applyPresentation` decides *how* to fold it into state.
 */
export interface Presentation {
	/** One notice for the rail; see {@link upsertNotice} for id-upsert vs append. */
	readonly notice?: Notice;
	/** Transcript ids to remove first — dedupe, or flip a live divider to done. */
	readonly removeTranscriptIds?: readonly string[];
	/** A transcript divider to append after removals. */
	readonly appendDivider?: SessionTranscriptMessage;
	/** Direct state-field patch (e.g. compaction flags). */
	readonly statePatch?: Partial<SessionState>;
	/** Notice ids to remove from the rail (e.g. a retry clears its stale failure row). */
	readonly dismissNoticeIds?: readonly string[];
}

/**
 * Fold a notice into the rail (cap 20). A notice with an `id` REPLACES the
 * same-id entry in place — a keyed, live-updating row, so a provider retry storm
 * collapses into one evolving row instead of a card per attempt. Unkeyed notices
 * append.
 */
export function upsertNotice(notices: readonly Notice[], notice: Notice): readonly Notice[] {
	if (notice.id) {
		const at = notices.findIndex(existing => existing.id === notice.id);
		if (at !== -1) return notices.map((existing, i) => (i === at ? notice : existing));
	}
	return [...notices.slice(-19), notice];
}

// --- compaction --------------------------------------------------------------

// Compaction is a DERIVED view: `isCompacting` (set here, rehydrated from the
// snapshot on reopen) is the single source of truth, and the live "compacting"
// divider is synthesized from it at the Thread render boundary. So compaction
// START only flips state — there is no transcript entry to lose to a journal
// refresh or a session switch (the live `compactionStarted` event never
// re-fires on reopen). Compaction END appends the durable "done" divider
// (token count + summary) unless the journal already supplied it.
/** Stable id so a failed/aborted compaction folds into ONE rail notice, and any later
 *  `compactionStarted` (manual retry or auto) clears that stale failure row. */
const COMPACTION_INCOMPLETE_NOTICE_ID = "compaction-incomplete";

function clearContextUsageAfterSuccessfulCompaction(
	contextUsage: SessionState["contextUsage"],
): SessionState["contextUsage"] {
	if (!contextUsage) return null;
	return { ...contextUsage, tokens: null, percent: null };
}

function presentCompactionStart(event: SessionEventOf<"compactionStarted">): Presentation {
	// A fresh compaction (retry or auto) supersedes any prior "didn't finish" notice.
	return {
		statePatch: { isCompacting: true, compactionReason: event.reason },
		dismissNoticeIds: [COMPACTION_INCOMPLETE_NOTICE_ID],
	};
}

function presentCompactionEnd(event: SessionEventOf<"compactionFinished">, state: SessionState): Presentation {
	// Dedupe by the divider's DETERMINISTIC id: the reducer can be invoked more
	// than once per dispatch (React StrictMode; duplicate delivery), each time on
	// the same input state, so removing any prior "done" divider for this
	// timestamp before re-appending keeps it to exactly one. Distinct real
	// compactions have distinct timestamps → still distinct dividers.
	const doneId = `compaction:${event.timestamp ?? "done"}`;
	const statePatch: Partial<SessionState> = { isCompacting: false, compactionReason: null };
	// Aborted/failed: do NOT silently clear the loader with nothing to show (the bug that
	// made `/compact` "vanish" — loader, then nothing). Surface a persistent rail notice so
	// the user knows it didn't complete; the next compaction start dismisses it. Nothing was
	// persisted, so the context is unchanged and it's safe to retry.
	if (event.aborted) {
		return {
			statePatch,
			notice: {
				id: COMPACTION_INCOMPLETE_NOTICE_ID,
				level: "warning",
				message: event.errorMessage
					? `Compaction failed: ${event.errorMessage}`
					: "Compaction didn't finish — your context is unchanged. Try /compact again.",
			},
		};
	}
	const compactedStatePatch: Partial<SessionState> = {
		...statePatch,
		contextUsage: clearContextUsageAfterSuccessfulCompaction(state.contextUsage),
	};
	// Dedupe against an ALREADY-PRESENT matching "done" divider — either the
	// journal-built durable one (the ACP adapter maps the journaled `compaction`
	// entry, which usually lands before this event reduces) or our own from a
	// duplicate delivery. Lanes without journal compaction mapping (the legacy
	// desktop adapter) still append below.
	const matchingDividerPresent = state.transcript.some(
		entry =>
			entry.role === "divider" &&
			entry.variant === "done" &&
			entry.tokens === event.tokensBefore &&
			entry.summary === event.shortSummary,
	);
	if (matchingDividerPresent) return { statePatch: compactedStatePatch };
	const divider: SessionTranscriptMessage = {
		id: doneId,
		role: "divider",
		blocks: [],
		variant: "done",
		// `auto` reads the PRE-patch reason (manual `/compact` vs auto threshold).
		auto: state.compactionReason != null && state.compactionReason !== "manual",
		...(typeof event.tokensBefore === "number" ? { tokens: event.tokensBefore } : {}),
		...(event.shortSummary ? { summary: event.shortSummary } : {}),
		timestamp: event.timestamp,
	};
	return { removeTranscriptIds: [doneId], appendDivider: divider, statePatch: compactedStatePatch };
}

// --- notices -----------------------------------------------------------------

/** One stable id per session so every retry event folds into a single rail row. */
const RETRY_NOTICE_ID = "provider-retry";

function retryHeadline(event: SessionEventOf<"retry">): string {
	if (event.phase === "succeeded") return "Recovered after retrying";
	if (event.phase === "failed") return "Retry failed";
	const suffix = event.attempt ? ` (attempt ${event.attempt}${event.maxAttempts ? `/${event.maxAttempts}` : ""})` : "";
	return `Auto-retrying${suffix}…`;
}

/**
 * Provider auto-retry → ONE self-updating rail row (id {@link RETRY_NOTICE_ID}),
 * not a card per attempt: each event upserts the same row with the live phase,
 * attempt, and latest (condensed) provider error as collapsible `detail`. A
 * success folds the storm into a single "Recovered" line. Model `fallback` is a
 * one-off switch, surfaced as a plain notice.
 */
function presentRetry(event: SessionEventOf<"retry">): Presentation {
	if (event.phase === "fallback") {
		const message = event.message ?? (event.toModel ? `Falling back to ${event.toModel}` : "Falling back");
		return { notice: { level: "info", message } };
	}
	return {
		notice: {
			id: RETRY_NOTICE_ID,
			level: event.phase === "failed" ? "error" : "info",
			message: retryHeadline(event),
			retry: {
				phase: event.phase,
				attempt: event.attempt,
				maxAttempts: event.maxAttempts,
				detail: event.message,
			},
		},
	};
}

function presentNotice(event: SessionEventOf<"notice">): Presentation {
	return { notice: { level: event.level, message: event.message } };
}

function presentCompatibilityIssue(event: SessionEventOf<"extensionCompatibilityIssue">): Presentation {
	return { notice: { level: "warning", message: event.issue.message } };
}

const TTSR_NOTICE_TTL_MS = 6000;

function presentTtsr(event: SessionEventOf<"ttsr">): Presentation {
	const names = event.rules.map(rule => rule.name);
	const label = names.length === 1 ? "rule" : "rules";
	// A rule injection is a transient self-correction (rewind → inject → retry): a
	// stable `id` folds repeated triggers into ONE row instead of stacking, and
	// `ttlMs` self-dismisses it so it never pins above the working tail.
	return {
		notice: {
			id: "ttsr",
			level: "warning",
			message: `Injecting ${label}: ${names.join(", ")}`,
			ttlMs: TTSR_NOTICE_TTL_MS,
		},
	};
}

// --- registry ----------------------------------------------------------------

const FEATURES: Record<string, Partial<Record<Phase, PhasePresenter>>> = {
	compaction: {
		start: event => presentCompactionStart(event as SessionEventOf<"compactionStarted">),
		end: (event, state) => presentCompactionEnd(event as SessionEventOf<"compactionFinished">, state),
	},
	retry: { update: event => presentRetry(event as SessionEventOf<"retry">) },
	notice: { update: event => presentNotice(event as SessionEventOf<"notice">) },
	compatibility: {
		update: event => presentCompatibilityIssue(event as SessionEventOf<"extensionCompatibilityIssue">),
	},
	ttsr: { start: event => presentTtsr(event as SessionEventOf<"ttsr">) },
};

interface FeatureRoute {
	readonly feature: string;
	readonly phase: Phase;
}

/** Map a driver event type → its (feature, phase). Absent = not a feature event. */
const FEATURE_ROUTES: Record<string, FeatureRoute | undefined> = {
	compactionStarted: { feature: "compaction", phase: "start" },
	compactionFinished: { feature: "compaction", phase: "end" },
	retry: { feature: "retry", phase: "update" },
	notice: { feature: "notice", phase: "update" },
	extensionCompatibilityIssue: { feature: "compatibility", phase: "update" },
	ttsr: { feature: "ttsr", phase: "start" },
};

function applyPresentation(state: SessionState, presentation: Presentation): SessionState {
	let transcript = state.transcript;
	if (presentation.removeTranscriptIds && presentation.removeTranscriptIds.length > 0) {
		const removed = new Set(presentation.removeTranscriptIds);
		transcript = transcript.filter(message => !removed.has(message.id));
	}
	if (presentation.appendDivider) transcript = [...transcript, presentation.appendDivider];
	let notices = state.notices;
	if (presentation.dismissNoticeIds && presentation.dismissNoticeIds.length > 0) {
		const drop = new Set(presentation.dismissNoticeIds);
		notices = notices.filter(notice => !notice.id || !drop.has(notice.id));
	}
	if (presentation.notice) notices = upsertNotice(notices, presentation.notice);
	return { ...state, ...presentation.statePatch, transcript, notices };
}

/** Reduce the closed set of feature-lifecycle events through the FEATURES registry. */
export function reduceFeatureEvent(state: SessionState, event: SessionStateAction): SessionState | undefined {
	const route = FEATURE_ROUTES[event.type];
	if (!route) return undefined;
	const presenter = FEATURES[route.feature]?.[route.phase];
	if (!presenter) return undefined;
	return applyPresentation(state, presenter(event, state));
}
