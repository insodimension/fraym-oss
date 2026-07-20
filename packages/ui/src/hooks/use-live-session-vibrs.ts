import type { SessionDriver, SessionDriverEvent, SessionRef, Unsubscribe } from "@fraym/driver";
import { useEffect, useRef, useState } from "react";
import { describeTool } from "../registries/describe-tool";
import { KIND_TO_VIBR } from "./session-tools";
import type { VibrMode, VibrState } from "./session-types";

/** The live presence a rail row needs: the same triple the foreground session feeds RailPresence. */
export interface RailVibr {
	readonly state: VibrState;
	readonly mode: VibrMode;
	readonly energy: number;
}

// A background session is subscribed mid-run, so seed it as actively working
// (mirrors the reducer's run-start vibr) until its own stream refines the state.
const VIBR_SEED: RailVibr = { state: "thinking", mode: "think", energy: 0.4 };
const VIBR_IDLE: RailVibr = { state: "idle", mode: "", energy: 0 };

// Energy/mode need the running-tool bookkeeping the canonical reducer keeps; track
// it alongside the public triple instead of rebuilding the whole SessionState.
export interface VibrAccum extends RailVibr {
	readonly toolCount: number;
	readonly runningTools: number;
}

export const VIBR_ACCUM_SEED: VibrAccum = { ...VIBR_SEED, toolCount: 0, runningTools: 0 };
const ACCUM_IDLE: VibrAccum = { ...VIBR_IDLE, toolCount: 0, runningTools: 0 };

/**
 * Mirror the canonical session reducer's vibr transitions (`reduceTranscriptEvent`
 * in session-transcript-core, `reduceToolEvent` in session-tools) WITHOUT its
 * transcript/task bookkeeping, so a backgrounded rail row animates identically at a
 * fraction of the cost. Keep in sync with those reducers if the vibr semantics move.
 */
export function reduceVibr(prev: VibrAccum, event: SessionDriverEvent): VibrAccum {
	switch (event.type) {
		case "queuedMessageStarted":
			return { ...prev, state: "thinking", mode: "think", energy: Math.max(prev.energy, 0.4) };
		case "assistantDelta":
			return { ...prev, state: "typing", mode: prev.runningTools > 0 ? prev.mode : "think" };
		case "thinkingDelta":
			return { ...prev, state: "thinking", mode: "think" };
		case "toolStarted": {
			const toolCount = prev.toolCount + 1;
			return {
				state: "thinking",
				mode: KIND_TO_VIBR[describeTool(event.toolName, event.input).kind],
				energy: Math.min(1, toolCount * 0.12 + 0.3),
				toolCount,
				runningTools: prev.runningTools + 1,
			};
		}
		case "toolFinished": {
			const runningTools = Math.max(0, prev.runningTools - 1);
			return { ...prev, mode: runningTools > 0 ? prev.mode : "think", runningTools };
		}
		case "runCompleted":
		case "runFailed":
			return ACCUM_IDLE;
		case "sessionOpened":
		case "sessionUpdated":
			return event.snapshot.status === "running" ? prev : ACCUM_IDLE;
		default:
			return prev;
	}
}

function railKey(ref: SessionRef): string {
	return `${ref.workspaceId}:${ref.sessionId}`;
}

const EMPTY: ReadonlyMap<string, RailVibr> = new Map();

interface VibrEntry {
	unsubscribe: Unsubscribe;
	accum: VibrAccum;
}

/**
 * Track the LIVE vibr of every running session in `runningRefs` — the rail's
 * foreground row already animates via the SessionProvider, so this is what lights
 * the BACKGROUND rows. Each ref gets its own engine subscription (switching never
 * closes a session, so the engine keeps streaming its in-flight run), reduced into
 * a `RailVibr` keyed by `workspaceId:sessionId` (matching `SessionItem.id`).
 *
 * The caller gates this on the opt-in "live state for all sessions" setting and
 * passes an empty list when off, so default users pay nothing. Subscriptions are
 * reconciled only when the SET of running sessions changes, not on every catalog
 * tick, and a row only re-publishes on an actual state/mode/energy transition.
 */
export function useLiveSessionVibrs(
	driver: SessionDriver | null | undefined,
	runningRefs: readonly SessionRef[],
): ReadonlyMap<string, RailVibr> {
	const [vibrs, setVibrs] = useState<ReadonlyMap<string, RailVibr>>(EMPTY);
	const registry = useRef<Map<string, VibrEntry>>(new Map());
	const refsRef = useRef(runningRefs);
	refsRef.current = runningRefs;
	// Re-run reconciliation only when the running SET changes (sessions start/stop),
	// never on every render — `runningRefs` is a fresh array each catalog mutation.
	const key = runningRefs.map(railKey).sort().join("\n");
	useEffect(() => {
		const reg = registry.current;
		if (!driver) {
			if (reg.size === 0) return;
			for (const entry of reg.values()) entry.unsubscribe();
			reg.clear();
			setVibrs(EMPTY);
			return;
		}
		const publish = () => {
			const next = new Map<string, RailVibr>();
			for (const [k, entry] of reg) {
				next.set(k, { state: entry.accum.state, mode: entry.accum.mode, energy: entry.accum.energy });
			}
			setVibrs(next);
		};
		// `key` is the wanted SET (and the effect's trigger); `refsRef` resolves each
		// key back to its full SessionRef without making the volatile array a dependency.
		const wantedKeys = key ? key.split("\n") : [];
		const refByKey = new Map(refsRef.current.map(ref => [railKey(ref), ref]));
		let dirty = false;
		for (const [k, entry] of reg) {
			if (refByKey.has(k)) continue;
			entry.unsubscribe();
			reg.delete(k);
			dirty = true;
		}
		for (const k of wantedKeys) {
			const ref = refByKey.get(k);
			if (!ref || reg.has(k)) continue;
			dirty = true;
			const entry: VibrEntry = { accum: VIBR_ACCUM_SEED, unsubscribe: () => {} };
			reg.set(k, entry);
			entry.unsubscribe = driver.subscribe(ref, event => {
				const current = reg.get(k);
				if (!current) return;
				const accum = reduceVibr(current.accum, event);
				const changed =
					accum.state !== current.accum.state ||
					accum.mode !== current.accum.mode ||
					accum.energy !== current.accum.energy;
				current.accum = accum; // always keep tool-count bookkeeping
				if (changed) publish();
			});
		}
		if (dirty) publish();
	}, [driver, key]);
	useEffect(
		() => () => {
			for (const entry of registry.current.values()) entry.unsubscribe();
			registry.current.clear();
		},
		[],
	);
	return vibrs;
}
