import type { Timestamp } from "./session-driver";

/** Attribution confidence for one session's relationship to a checkout. A shared
 * checkout is never claimed as exclusively owned by this session. */
export type SessionScmConfidence = "exclusive" | "shared" | "inferred";

export interface SessionScmCheckout {
	readonly dirtyCount: number;
	readonly ahead: number;
	readonly behind: number;
}

export interface SessionScmCommit {
	readonly sha: string;
	readonly subject?: string;
	readonly pushed: boolean;
	readonly confidence: SessionScmConfidence;
}

/** Durable, journal-derived SCM facts attributed to exactly one session. */
export interface SessionScmLedger {
	readonly available: boolean;
	readonly checkoutRoot?: string;
	readonly baselineHead?: string;
	readonly branch?: string;
	readonly exclusive: boolean;
	readonly confidence: SessionScmConfidence;
	readonly touchedPaths: readonly string[];
	/** Session-attributed paths, not checkout-wide dirty paths. */
	readonly changedFiles: readonly string[];
	readonly commits: readonly SessionScmCommit[];
	readonly committedCount: number;
	readonly pushedCount: number;
	readonly unpushedCount: number;
	readonly checkout: SessionScmCheckout;
	/** The recorder stamped the terminal session state. Its presence is not a
	 * claim that the checkout itself has been merged, pushed, or cleaned. */
	readonly finished?: boolean;
	readonly updatedAt: Timestamp;
}

/** One `custom` journal payload. The fold intentionally knows no filesystem or
 * transport details, so live append and cold replay use identical evidence. */
export interface SessionScmJournalEntry {
	readonly customType: string;
	readonly data?: unknown;
	readonly timestamp?: Timestamp;
}

type RecordLike = Readonly<Record<string, unknown>>;

const CONFIDENCE_RANK: Readonly<Record<SessionScmConfidence, number>> = {
	exclusive: 0,
	shared: 1,
	inferred: 2,
};
const SCM_CUSTOM_TYPES: Readonly<Record<string, true>> = {
	"scm.baseline": true,
	"scm.mutation": true,
	"scm.commit": true,
	"scm.push": true,
	"scm.finish": true,
};

function recordValue(value: unknown): RecordLike | undefined {
	return value !== null && typeof value === "object" && !Array.isArray(value) ? (value as RecordLike) : undefined;
}

function stringValue(value: unknown): string | undefined {
	return typeof value === "string" && value.length > 0 ? value : undefined;
}

function finiteNumber(value: unknown): number | undefined {
	return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function confidenceValue(value: unknown, fallback: SessionScmConfidence): SessionScmConfidence {
	return value === "exclusive" || value === "shared" || value === "inferred" ? value : fallback;
}

function worstConfidence(a: SessionScmConfidence, b: SessionScmConfidence): SessionScmConfidence {
	return CONFIDENCE_RANK[b] > CONFIDENCE_RANK[a] ? b : a;
}

function isScmCustomType(value: string | undefined): value is SessionScmJournalEntry["customType"] {
	return value !== undefined && SCM_CUSTOM_TYPES[value] === true;
}

function paths(value: unknown): string[] {
	return Array.isArray(value)
		? value.flatMap(item => (typeof item === "string" && item.length > 0 ? [item] : []))
		: [];
}

function checkoutSample(data: RecordLike): SessionScmCheckout | undefined {
	const checkout = recordValue(data.checkout);
	const dirtyCount = finiteNumber(checkout?.dirtyCount);
	const ahead = finiteNumber(checkout?.ahead);
	const behind = finiteNumber(checkout?.behind);
	return dirtyCount === undefined || ahead === undefined || behind === undefined
		? undefined
		: { dirtyCount, ahead, behind };
}

function addPaths(target: string[], source: unknown): void {
	for (const path of paths(source)) if (!target.includes(path)) target.push(path);
}

function applyCommit(
	commits: SessionScmCommit[],
	sha: string,
	subject: string | undefined,
	confidence: SessionScmConfidence,
	pushed: boolean,
): void {
	const index = commits.findIndex(commit => commit.sha === sha);
	if (index < 0) {
		commits.push({ sha, ...(subject ? { subject } : {}), confidence, pushed });
		return;
	}
	const current = commits[index]!;
	commits[index] = {
		...current,
		...(subject ? { subject } : {}),
		confidence: worstConfidence(current.confidence, confidence),
		pushed: current.pushed || pushed,
	};
}

/** Narrow an arbitrary custom journal payload to the SCM subset without trusting
 * data received from the extension wire. */
export function sessionScmJournalEntryFromCustomPayload(value: unknown): SessionScmJournalEntry | null {
	const payload = recordValue(value);
	const customType = stringValue(payload?.customType);
	if (!isScmCustomType(customType)) return null;
	const timestamp = stringValue(payload?.timestamp);
	return {
		customType,
		...(payload?.data === undefined ? {} : { data: payload.data }),
		...(timestamp ? { timestamp } : {}),
	};
}

/**
 * Purely rebuild one session's SCM projection from durable custom journal
 * entries. The ledger is absent until a valid baseline exists; consumers must
 * never manufacture attribution for older journals.
 */
export function foldSessionScmLedger(entries: readonly SessionScmJournalEntry[]): SessionScmLedger | undefined {
	let state:
		| {
				available: boolean;
				checkoutRoot?: string;
				baselineHead?: string;
				branch?: string;
				baselineConfidence: SessionScmConfidence;
				confidences: SessionScmConfidence[];
				touchedPaths: string[];
				commits: SessionScmCommit[];
				checkout: SessionScmCheckout;
				afterDirty?: number;
				finished?: boolean;
				updatedAt: Timestamp;
		  }
		| undefined;

	for (const entry of entries) {
		if (!isScmCustomType(entry.customType)) continue;
		const data = recordValue(entry.data);
		if (!data) continue;
		const timestamp = stringValue(data.updatedAt) ?? stringValue(data.at) ?? entry.timestamp;

		if (entry.customType === "scm.baseline") {
			if (typeof data.available !== "boolean" || !timestamp) continue;
			const sample = checkoutSample(data) ?? {
				dirtyCount: finiteNumber(data.dirtyCount) ?? 0,
				ahead: finiteNumber(data.ahead) ?? 0,
				behind: finiteNumber(data.behind) ?? 0,
			};
			const baselineConfidence = confidenceValue(
				data.confidence,
				data.exclusive === true ? "exclusive" : "inferred",
			);
			state = {
				available: data.available,
				...(stringValue(data.checkoutRoot) ? { checkoutRoot: stringValue(data.checkoutRoot) } : {}),
				...((stringValue(data.baselineHead) ?? stringValue(data.head))
					? { baselineHead: stringValue(data.baselineHead) ?? stringValue(data.head) }
					: {}),
				...(stringValue(data.branch) ? { branch: stringValue(data.branch) } : {}),
				baselineConfidence,
				// The baseline stamp is a starting point, not an attribution claim — it
				// must not drag the worst-of fold down (it is always "inferred" in a
				// shared checkout, which made every non-worktree session read as
				// unverified). Only attribution-carrying entries (mutation/commit/push)
				// vote; the baseline is the fallback when none exist yet.
				confidences: [],
				touchedPaths: [],
				commits: [],
				checkout: sample,
				updatedAt: timestamp,
			};
			continue;
		}

		if (!state) continue;
		if (typeof data.available === "boolean") state.available = data.available;
		if (stringValue(data.checkoutRoot)) state.checkoutRoot = stringValue(data.checkoutRoot);
		if (stringValue(data.branch)) state.branch = stringValue(data.branch);
		const nextConfidence = confidenceValue(data.confidence, state.baselineConfidence);
		const sample = checkoutSample(data);
		if (sample) state.checkout = sample;
		const afterDirty = finiteNumber(data.afterDirty);
		if (afterDirty !== undefined) state.afterDirty = afterDirty;

		if (entry.customType === "scm.mutation") {
			if (data.ok !== false) {
				addPaths(state.touchedPaths, data.touchedPaths);
				addPaths(state.touchedPaths, data.changedFiles);
			}
			state.confidences.push(nextConfidence);
		} else if (entry.customType === "scm.commit") {
			const recorded = recordValue(data.commit);
			const sha = stringValue(recorded?.sha);
			if (sha) {
				applyCommit(
					state.commits,
					sha,
					stringValue(recorded?.subject),
					confidenceValue(recorded?.confidence, nextConfidence),
					recorded?.pushed === true,
				);
			}
			const shas = paths(data.shas);
			const subjects = paths(data.subjects);
			for (const [index, sha] of shas.entries())
				applyCommit(state.commits, sha, subjects[index], nextConfidence, false);
			state.confidences.push(nextConfidence);
		} else if (entry.customType === "scm.push") {
			for (const commit of Array.isArray(data.commits) ? data.commits : []) {
				const recorded = recordValue(commit);
				const sha = stringValue(recorded?.sha);
				if (!sha) continue;
				applyCommit(
					state.commits,
					sha,
					stringValue(recorded?.subject),
					confidenceValue(recorded?.confidence, nextConfidence),
					true,
				);
			}
			for (const sha of paths(data.pushedShas)) applyCommit(state.commits, sha, undefined, nextConfidence, true);
			state.confidences.push(nextConfidence);
		} else if (entry.customType === "scm.finish") {
			if (typeof data.finished === "boolean") state.finished = data.finished;
			else if (typeof data.ok === "boolean" && typeof data.conflict === "boolean")
				state.finished = data.ok && !data.conflict;
		}
		if (timestamp) state.updatedAt = timestamp;
	}

	if (!state) return undefined;
	const confidence = !state.available
		? "inferred"
		: state.confidences.length === 0
			? state.baselineConfidence
			: state.confidences.reduce(worstConfidence, "exclusive" as SessionScmConfidence);
	const committedCount = state.commits.length;
	const pushedCount = state.commits.filter(commit => commit.pushed).length;
	return {
		available: state.available,
		...(state.checkoutRoot ? { checkoutRoot: state.checkoutRoot } : {}),
		...(state.baselineHead ? { baselineHead: state.baselineHead } : {}),
		...(state.branch ? { branch: state.branch } : {}),
		exclusive: confidence === "exclusive",
		confidence,
		touchedPaths: state.touchedPaths,
		changedFiles: state.touchedPaths,
		commits: state.commits,
		committedCount,
		pushedCount,
		unpushedCount: committedCount - pushedCount,
		checkout: state.afterDirty === undefined ? state.checkout : { ...state.checkout, dirtyCount: state.afterDirty },
		...(state.finished === undefined ? {} : { finished: state.finished }),
		updatedAt: state.updatedAt,
	};
}
