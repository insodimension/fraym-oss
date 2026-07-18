// Fraym demo script — the "atlas Code × Codex" showcase conversation, expressed
// as pure session-driver events. Replayed through @fraym/driver/mock so the
// UI renders it via the exact same path a live engine would: no mock-mode branch.
//
// Pacing mirrors the design prototype (docs/design/fraym-ui-remix): each phase
// announces a working verb, pauses to "think" (600–1300ms), reveals its block,
// then a short gap — so the causal working is visible, not a superfast flash.
//
// Pure data: depends only on @fraym/driver types. No JSX, no @fraym/ui —
// tool/diff/search cards are produced by the renderer registries from these events.

import type { SessionRef, SessionSnapshot, WorkspaceRef } from "@fraym/driver";
import type { DemoScript, ScriptedEvent, ScriptStep } from "@fraym/driver/mock";

const NOW = "2026-05-31T12:00:00.000Z";

const SOURCE = { path: "fraym-demo", source: "@fraym/fixtures", scope: "temporary", origin: "package" } as const;

const WORKSPACE: WorkspaceRef = {
	workspaceId: "fraym-api",
	path: "/work/fraym-api",
	displayName: "fraym-api",
};

const REF: SessionRef = { workspaceId: "fraym-api", sessionId: "demo-ratelimit" };

const SNAPSHOT: SessionSnapshot = {
	ref: REF,
	workspace: WORKSPACE,
	title: "Rate-limit auth middleware",
	status: "idle",
	updatedAt: NOW,
	contextUsage: { tokens: 142_300, contextWindow: 200_000, percent: 0.7115 },
	config: { provider: "acme", modelId: "Opus 4.6", thinkingLevel: "high" },
};

// --- step authoring helpers -------------------------------------------------

function step(event: ScriptedEvent, delayMs = 0): ScriptStep {
	return { event, delayMs };
}

/** Set the live status verb (Searching…/Editing…/Running tests…) the presence + tail reflect. */
function verb(message: string): ScriptedEvent {
	return { type: "workingStatus", status: { message, visible: true } };
}

function userMessage(id: string, text: string): ScriptedEvent {
	return {
		type: "queuedMessageStarted",
		message: { id, mode: "followUp", text, createdAt: NOW, updatedAt: NOW },
	};
}

function say(text: string): ScriptedEvent {
	return { type: "assistantDelta", text };
}

function toolStart(callId: string, toolName: string, input?: unknown): ScriptedEvent {
	return { type: "toolStarted", callId, toolName, input };
}

function toolDone(callId: string, output?: unknown, success = true): ScriptedEvent {
	return { type: "toolFinished", callId, success, output };
}

function completed(): ScriptedEvent {
	return { type: "runCompleted", snapshot: SNAPSHOT };
}

/** Turn boundary — frozen "Worked for Xs" duration + final-turn marker (mirrors Engine `agent_end`). */
function turnEnded(durationMs: number, final = true): ScriptedEvent {
	return { type: "turnEnded", durationMs, final };
}

interface PhaseTiming {
	/** Gap before the verb appears. */
	readonly gap?: number;
	/** "Thinking" pause after the verb, before the block is revealed. */
	readonly think?: number;
	/** How long the tool card sits in its running state before finishing. */
	readonly run?: number;
}

function timingGap(t: PhaseTiming): number {
	return t.gap ?? 300;
}

function timingThink(t: PhaseTiming): number {
	return t.think ?? 900;
}

function timingRun(t: PhaseTiming): number {
	return t.run ?? 700;
}

function phaseTiming(t: PhaseTiming & { readonly success?: boolean }) {
	return {
		gap: timingGap(t),
		think: timingThink(t),
		run: timingRun(t),
		success: t.success ?? true,
	};
}

/** A streamed text phase: verb → think → the sentence in a couple of typed chunks. */
function textPhase(message: string, chunks: readonly string[], t: PhaseTiming = {}): ScriptStep[] {
	return [
		step(verb(message), t.gap ?? 280),
		...chunks.map((chunk, i) => step(say(chunk), i === 0 ? (t.think ?? 480) : 110)),
	];
}

/** A tool phase: verb → think → the card appears running → run → it resolves. */
function toolPhase(
	message: string,
	callId: string,
	toolName: string,
	input: unknown,
	output: unknown,
	t: PhaseTiming & { readonly success?: boolean } = {},
): ScriptStep[] {
	const timing = phaseTiming(t);
	return [
		step(verb(message), timing.gap),
		step(toolStart(callId, toolName, input), timing.think),
		step(toolDone(callId, output, timing.success), timing.run),
	];
}

// --- the run (mirrors the prototype RUN: tests → fail → fix → green → store → PR) ---

const RUN_REPLY: ScriptStep[] = [
	...textPhase(
		"Planning the change",
		[
			"On it — I'll author tests against the limiter, ",
			"add a Redis-backed store behind the same interface, get the suite green, then open a draft PR.",
		],
		{ think: 560 },
	),
	...toolPhase(
		"Searching the codebase",
		"r-grep",
		"Grep",
		{ pattern: "RateLimiter" },
		[
			{ file: "src/lib/rateLimit.ts", line: 8, text: "export class RateLimiter {" },
			{ file: "src/middleware/auth.ts", line: 11, text: "const limiter = new RateLimiter({ max: 5 })" },
			{ file: "src/lib/store.ts", line: 1, text: "export interface Store {" },
		],
		{ think: 880, run: 650 },
	),
	...toolPhase(
		"Authoring tests",
		"r-tests",
		"Write",
		{
			path: "src/lib/rateLimit.test.ts",
			old_string: "",
			new_string:
				"import { RateLimiter } from './rateLimit'\n\ntest('blocks the 6th hit in a window', () => {\n  const rl = new RateLimiter({ max: 5, windowMs: 60_000 })\n  for (let i = 0; i < 5; i++) expect(rl.check('ip').ok).toBe(true)\n  expect(rl.check('ip').ok).toBe(false)\n})",
		},
		undefined,
		{ think: 1100, run: 700 },
	),
	...toolPhase(
		"Running the suite",
		"r-test1",
		"Bash",
		{ command: "npm test -- rateLimit" },
		"$ npm test -- rateLimit\nFAIL  src/lib/rateLimit.test.ts\n  ✗ resets the window after 60s\n    expected ok=true after 60s, got ok=false\nTests: 1 failed, 11 passed, 12 total",
		{ think: 900, run: 1200, success: false },
	),
	...textPhase(
		"Diagnosing the failure",
		[
			"One edge case — expired buckets weren't evicted on window reset, ",
			"so the count never dropped. Patching the eviction in check().",
		],
		{ think: 820 },
	),
	...toolPhase(
		"Editing rateLimit.ts",
		"r-fix",
		"Edit",
		{
			path: "src/lib/rateLimit.ts",
			old_string: "  const hits = this.buckets.get(key) ?? []",
			new_string:
				"  const now = Date.now()\n  const hits = (this.buckets.get(key) ?? []).filter(t => now - t < this.windowMs)",
		},
		undefined,
		{ think: 700, run: 620 },
	),
	...toolPhase(
		"Re-running the suite",
		"r-test2",
		"Bash",
		{ command: "npm test -- rateLimit" },
		"$ npm test -- rateLimit\nPASS  src/lib/rateLimit.test.ts\nTests: 12 passed, 12 total",
		{ think: 1100, run: 900 },
	),
	...toolPhase(
		"Adding the Redis store",
		"r-redis",
		"Write",
		{
			path: "src/lib/redisStore.ts",
			old_string: "",
			new_string:
				"import type { Store } from './store'\n\nexport class RedisStore implements Store {\n  constructor(private redis: Redis) {}\n  async hit(key: string, windowMs: number) {\n    const n = await this.redis.incr(key)\n    if (n === 1) await this.redis.pexpire(key, windowMs)\n    return n\n  }\n}",
		},
		undefined,
		{ think: 980, run: 720 },
	),
	...toolPhase(
		"Opening the pull request",
		"r-pr",
		"mcp__github__create_pull_request",
		{ branch: "feat/ratelimit", base: "main", draft: true },
		"▸ branch feat/ratelimit → main\n  3 files changed, +67 −4\n✓ draft PR #248 opened: “Rate-limit auth + Redis store”",
		{ think: 1100, run: 900 },
	),
	...textPhase(
		"Wrapping up",
		[
			"Shipped. Added rateLimit.test.ts (12 cases, all green), a RedisStore behind the existing Store interface, ",
			"and fixed the window-eviction bug. Draft PR #248 is open — review when you're ready.",
		],
		{ think: 620 },
	),
	step(turnEnded(135_000), 0),
	step(completed(), 240),
];

// --- the script -------------------------------------------------------------

export const fraymDemoScript: DemoScript = {
	snapshot: SNAPSHOT,
	commands: [
		{ name: "compact", description: "Summarize and trim context", source: "extension", sourceInfo: SOURCE },
		{ name: "diff", description: "Show working-tree diff", source: "extension", sourceInfo: SOURCE },
		{ name: "model", description: "Switch model and effort", source: "extension", sourceInfo: SOURCE },
	],
	completions: [
		{ kind: "command", label: "/compact", value: "/compact", detail: "Summarize and trim context" },
		{ kind: "command", label: "/diff", value: "/diff", detail: "Show working-tree diff" },
		{ kind: "command", label: "/model", value: "/model", detail: "Switch model and effort" },
	],

	// Seeded opening exchange — a finished turn, paced so it streams in causally on
	// load (verb → think → block) rather than appearing all at once.
	intro: [
		step(
			userMessage(
				"u-ratelimit",
				"Our /auth/login endpoint is getting hammered. Add per-IP rate limiting to the auth middleware: 5 attempts per minute, return 429 with a Retry-After header. Keep it in-memory but make the store swappable.",
			),
			200,
		),
		...textPhase(
			"Thinking",
			[
				"Done. I added a swappable RateLimiter with an in-memory default and wired a sliding-window check ",
				"into requireAuth before credentials are validated, so brute-force attempts never reach the credential check.",
			],
			{ think: 520 },
		),
		...toolPhase(
			"Reading the middleware",
			"i-read",
			"Read",
			{ paths: ["src/middleware/auth.ts", "src/middleware/auth.test.ts", "src/lib/store.ts"] },
			"src/middleware/auth.ts        112\nsrc/middleware/auth.test.ts    96\nsrc/lib/store.ts               40",
			{ think: 620, run: 560 },
		),
		...toolPhase(
			"Editing auth.ts",
			"i-edit",
			"Edit",
			{
				path: "src/middleware/auth.ts",
				old_string: "  const token = req.headers.authorization",
				new_string:
					"  const hit = await limiter.check(req.ip)\n  if (!hit.ok) {\n    res.setHeader('Retry-After', hit.retryAfter)\n    return res.status(429).json({ error: 'too_many_requests' })\n  }\n  const token = req.headers.authorization",
			},
			undefined,
			{ think: 560, run: 600 },
		),
		step(turnEnded(38_000), 0),
		step(completed(), 220),
	],

	// First user send (e.g. the matching "Add unit tests…" suggestion) — the rich,
	// well-timed causal showcase.
	replies: [{ steps: RUN_REPLY }],

	// Played once the scripted reply is exhausted.
	defaultReply: {
		steps: [
			...textPhase(
				"Thinking",
				[
					"This is the scripted demo driver replaying canned events. ",
					"Attach a real SessionDriver and this turn streams through the live engine instead.",
				],
				{ think: 520 },
			),
			step(turnEnded(6_000), 0),
			step(completed(), 200),
		],
	},
};
