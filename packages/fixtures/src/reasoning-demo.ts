// Reasoning demo script — a thinking-focused conversation expressed as pure
// session-driver events. Replayed through @fraym/driver/mock so the reasoning
// block renders inside a real thread via the production renderer
// (`renderReasoningBlock` → <ReasoningBlock>).
//
// Reasoning is a MESSAGE BLOCK, not a tool: the engine maps the model's
// `thinkingDelta` stream into a `{ type: "reasoning", text }` transcript block
// that the reducer grows in place (appendInline). Each `think()` delta appends to
// the trailing reasoning block, so emitting several in a row streams the trace
// live — exactly like a real run. While streaming, the block animates (the
// renderer passes animate={isStreaming && isLast}); once settled it collapses to a
// "Reasoning" summary you can expand.
//
// This walks the reasoning shapes: a streamed plan before any action, a terse mid-
// run beat between tool/text, and a longer multi-paragraph deliberation — and
// interleaves a tool call so you can verify the reasoning row aligns with the tool
// gutter down the thread. Pure data: no JSX, no fraym-ui.

import type { SessionRef, SessionSnapshot, WorkspaceRef } from "@fraym/driver";
import type { DemoScript, ScriptedEvent, ScriptStep } from "@fraym/driver/mock";

const NOW = "2026-06-03T12:00:00.000Z";

const WORKSPACE: WorkspaceRef = {
	workspaceId: "fraym-reasoning",
	path: "/work/fraym-reasoning",
	displayName: "fraym-reasoning",
};

const REF: SessionRef = { workspaceId: "fraym-reasoning", sessionId: "demo-reasoning" };

const SNAPSHOT: SessionSnapshot = {
	ref: REF,
	workspace: WORKSPACE,
	title: "Reasoning trace tour",
	status: "idle",
	updatedAt: NOW,
	contextUsage: { tokens: 18_900, contextWindow: 200_000, percent: 0.0945 },
	config: { provider: "acme", modelId: "Opus 4.6", thinkingLevel: "high" },
};

// --- step authoring helpers (mirror write-demo) -----------------------------

function step(event: ScriptedEvent, delayMs = 0): ScriptStep {
	return { event, delayMs };
}

function verb(message: string): ScriptedEvent {
	return { type: "workingStatus", status: { message, visible: true } };
}

function userMessage(id: string, text: string): ScriptedEvent {
	return { type: "queuedMessageStarted", message: { id, mode: "followUp", text, createdAt: NOW, updatedAt: NOW } };
}

function say(text: string): ScriptedEvent {
	return { type: "assistantDelta", text };
}

function think(text: string): ScriptedEvent {
	return { type: "thinkingDelta", text };
}

function toolStart(callId: string, toolName: string, input: unknown): ScriptedEvent {
	return { type: "toolStarted", callId, toolName, input };
}

function toolDone(callId: string, output: unknown, success = true): ScriptedEvent {
	return { type: "toolFinished", callId, success, output };
}

function completed(): ScriptedEvent {
	return { type: "runCompleted", snapshot: SNAPSHOT };
}

/** A tool result's `{ content, details }` envelope. */
function result(text: string, extraDetails: Record<string, unknown> = {}): unknown {
	return { content: [{ type: "text", text }], details: { ...extraDetails } };
}

/**
 * Stream one reasoning beat: emit `chunks` as consecutive `thinkingDelta`s with a
 * per-chunk delay, so the trace grows line-by-line (and animates) exactly like a
 * live thinking stream. The chunks should already carry their own spacing.
 */
function thinkStream(chunks: readonly string[], opts: { tick?: number; lead?: number } = {}): ScriptStep[] {
	const tick = opts.tick ?? 240;
	return chunks.map((chunk, i) => step(think(chunk), i === 0 ? (opts.lead ?? 320) : tick));
}

// --- reasoning content ------------------------------------------------------

// A streamed plan, authored as chunks that read as a growing chain of thought.
const PLAN_CHUNKS = [
	"Let me scope this before touching anything. ",
	"The request is a rate limiter for the public API — so the real questions are the algorithm and where the counter state lives.\n\n",
	"**Algorithm.** A fixed window is trivial but lets bursts double up at the boundary. A sliding-window log is precise but stores every hit. ",
	"A token bucket gives smooth limits with O(1) state, so that's the pick.\n\n",
	"**State.** In-memory is fastest but won't survive multiple instances; ",
	"Redis with an atomic INCR/EXPIRE (or a small Lua script) keeps it correct across the fleet. I'll go Redis.\n\n",
	"So: a token-bucket middleware backed by a Redis Lua script, keyed by client id, returning 429 + Retry-After when drained. Let me confirm the current middleware shape first.",
];

const MID_CHUNKS = [
	"The middleware stack already runs auth before the handler, ",
	"so the client id is on the request by the time we reach the limiter — good, I can key off that directly instead of re-parsing the token.",
];

// A longer, multi-paragraph deliberation (exercises the scroll + markdown body).
const DEEP_CHUNKS = [
	"Now the failure modes, because a limiter that fails wrong is worse than none.\n\n",
	"**Redis is down.** Fail-open or fail-closed? Failing closed turns a cache blip into a full outage; failing open drops the limit but keeps the API serving. For a public API the safer default is fail-open with a loud metric, so I'll catch the Redis error, emit a counter, and let the request through.\n\n",
	"**Clock skew.** The Lua script must compute the refill from a single clock — Redis's own `TIME`, not the app server's — otherwise drifting nodes hand out extra tokens. I'll pass nothing time-related from the app and let the script read `TIME`.\n\n",
	"**Hot keys.** A single abusive client hammers one Redis slot. That's acceptable for v1; if it bites we shard the bucket by a hash suffix. I'll note it but not build it yet.\n\n",
	"That's enough certainty to write the script and the middleware. Starting with the Lua.",
];

// --- the conversation -------------------------------------------------------

const INTRO: ScriptStep[] = [
	step(
		userMessage(
			"u-reasoning",
			"Add rate limiting to the public API. Walk me through how you'd approach it before you write code.",
		),
		200,
	),
	step(verb("Thinking")),
	// 1) A streamed plan before any action — the headline reasoning beat.
	...thinkStream(PLAN_CHUNKS, { lead: 420, tick: 260 }),
	step(
		say(
			"Here's the plan: a **token-bucket** limiter backed by a Redis Lua script, keyed per client. Let me check the middleware: ",
		),
		360,
	),

	// 2) A tool call, so the reasoning rows sit on the same gutter as the tool.
	step(verb("Reading middleware")),
	step(toolStart("r-mw", "read", { path: "src/server/middleware.ts" }), 220),
	step(
		toolDone(
			"r-mw",
			result("export const stack = [requestId, auth, bodyParser, route];", {
				path: "src/server/middleware.ts",
				lines: 1,
			}),
		),
		520,
	),

	// 3) A terse mid-run reasoning beat between tool and text.
	step(verb("Thinking")),
	...thinkStream(MID_CHUNKS, { lead: 300, tick: 240 }),
	step(
		say("Auth runs first, so the client id is already on the request. Now the tricky part — the failure modes: "),
		340,
	),

	// 4) A longer deliberation that fills the scroll + shows markdown structure.
	step(verb("Reasoning")),
	...thinkStream(DEEP_CHUNKS, { lead: 320, tick: 300 }),
	step(
		say(
			"Decision: token bucket in a Redis Lua script (clock from Redis `TIME`), **fail-open** with a metric if Redis is unreachable, returning `429` + `Retry-After`. Ready to write it when you are.",
		),
		360,
	),
	step(completed(), 220),
];

export const reasoningDemoScript: DemoScript = {
	snapshot: SNAPSHOT,
	intro: INTRO,
	defaultReply: {
		steps: [
			step(verb("Thinking")),
			...thinkStream(
				[
					"Quick check before I answer: ",
					"this is the scripted reasoning demo, so there's no live model behind it — ",
					"attach a real engine to stream genuine chain-of-thought here.",
				],
				{ lead: 320, tick: 240 },
			),
			step(say("Scripted reasoning-demo driver — attach a real engine to stream live reasoning."), 320),
			step(completed(), 200),
		],
	},
};
