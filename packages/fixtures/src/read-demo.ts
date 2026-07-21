// Read demo script — a `read`-focused conversation expressed as pure
// session-driver events. Replayed through @fraym-ai/driver/mock so the read tool
// renders inside a real thread via the renderer registry (the kitchen-sink scopes
// a `read` renderer override around it). The conversation walks every read shape:
// code → markdown → directory → sqlite → image → url → error.
//
// Pure data: depends only on @fraym-ai/driver types. No JSX, no fraym-ui.

import type { SessionRef, SessionSnapshot, WorkspaceRef } from "@fraym-ai/driver";
import type { DemoScript, ScriptedEvent, ScriptStep } from "@fraym-ai/driver/mock";
import { assistantDelta as say, queuedMessage, runCompleted, scriptedStep as step, toolFinished as toolDone, toolStarted, workingStatus as verb } from "./scripted-event-utils";

const NOW = "2026-06-02T12:00:00.000Z";

const WORKSPACE: WorkspaceRef = {
	workspaceId: "fraym-read",
	path: "/work/fraym-read",
	displayName: "fraym-read",
};

const REF: SessionRef = { workspaceId: "fraym-read", sessionId: "demo-read" };

const SNAPSHOT: SessionSnapshot = {
	ref: REF,
	workspace: WORKSPACE,
	title: "Explore the auth module",
	status: "idle",
	updatedAt: NOW,
	contextUsage: { tokens: 38_200, contextWindow: 200_000, percent: 0.191 },
	config: { provider: "acme", modelId: "Opus 4.6", thinkingLevel: "high" },
};

function userMessage(id: string, text: string): ScriptedEvent {
	return queuedMessage(id, text, NOW);
}

function toolStart(callId: string, input: unknown): ScriptedEvent {
	return toolStarted(callId, "read", input);
}

function completed(): ScriptedEvent {
	return runCompleted(SNAPSHOT);
}

/** A read phase: verb → the card appears running → it resolves. */
function readPhase(
	message: string,
	callId: string,
	path: string,
	output: unknown,
	opts: { success?: boolean; think?: number; run?: number } = {},
): ScriptStep[] {
	return [
		step(verb(message), 260),
		step(toolStart(callId, { path }), opts.think ?? 620),
		step(toolDone(callId, output, opts.success ?? true), opts.run ?? 560),
	];
}

// --- realistic read outputs (the `AgentToolResult` shape the engine forwards) ---------

const CODE_TS = `import { signToken } from "./jwt";
import type { User, Session } from "./types";

export function login(user: User): Session {
	const token = signToken(user);
	return { user, token, issuedAt: Date.now() };
}

export function logout(session: Session): void {
	revoke(session.token);
}`;

const MD_DOC = `# Cockpit

A fictional Acme Labs workspace for organized project reviews.

## Hierarchy

- token → element → component → feature
- the \`read\` tool is a *feature*

> Build first, classify after.`;

const URL_DOC = `# Introduction

Welcome to the docs. This page is rendered in **reader mode** —
boilerplate stripped, content kept.

- Getting started
- Core concepts
- API reference`;

const DIR_LISTING = `auth/\ntools/\ncli.ts        4.2 KB\nindex.ts      2.0 KB\nconfig.json   812 B\nREADME.md     6.1 KB`;
const DB_LISTING = `users (1240 rows)\nsessions (88 rows)\nmigrations (12 rows)\naudit_log (9031 rows)`;

/** Build the `{ content, details }` result the read tool returns (mirrors AgentToolResult). */
function fileResult(text: string, details: Record<string, unknown> = {}): unknown {
	return { content: [{ type: "text", text }], details: { displayContent: { text, startLine: 1 }, ...details } };
}

const RL_CORE = `export class RateLimiter {
	constructor(private max: number, private windowMs: number) {}
	check(ip: string): boolean {
		// sliding-window check
		return this.count(ip) < this.max;
	}
}`;
const RL_TEST = `import { RateLimiter } from "./rateLimit";

test("blocks after max", () => {
	const rl = new RateLimiter(5, 60_000);
	expect(rl.check("ip")).toBe(true);
});`;
const RL_STORE = `export interface Store {
	get(key: string): number;
	incr(key: string): void;
}`;

const RANGE_CODE = `  const token = signToken(user);
	return { user, token, issuedAt: Date.now() };
}`;
const RAW_JSON = `{
	"name": "cockpit",
	"version": "0.1.0",
	"private": true
}`;
const CONFLICT_INDEX = `conflict://1  src/merge.ts:12-18  (HEAD vs feature/x)
conflict://2  src/merge.ts:40-47  (HEAD vs feature/x)`;
const CONFLICT_BLOCK = `<<<<<<< HEAD
  return resolve(token, { strict: true });
=======
  return resolve(token);
>>>>>>> feature/x`;
const SCHEMA_SQL = `CREATE TABLE users (
	id INTEGER PRIMARY KEY,
	email TEXT NOT NULL,
	created_at INTEGER
);

Sample rows:
| id | email           |
| 1  | ada@example.com |`;

// --- the conversation -------------------------------------------------------

const INTRO: ScriptStep[] = [
	step(
		userMessage(
			"u-read",
			"Give me a tour of the project — read the login flow, the readme, the folder, the db, the avatar, and the docs page. Also try the secrets file.",
		),
		200,
	),
	...readPhase(
		"Reading the login flow",
		"r-code",
		"src/auth/login.ts",
		fileResult(CODE_TS, { summary: { lines: 11, elidedSpans: 2, elidedLines: 18 } }),
		{ think: 540 },
	),
	step(say("Here's the login flow. "), 360),
	...readPhase(
		"Reading the readme",
		"r-md",
		"README.md",
		fileResult(MD_DOC, { contentType: "text/markdown", suffixResolution: { from: "READ.md", to: "README.md" } }),
		{
			think: 480,
		},
	),
	step(say("And the project overview. Now the layout: "), 320),
	...readPhase("Listing the source tree", "r-dir", "src/", fileResult(DIR_LISTING, { isDirectory: true }), {
		think: 420,
	}),
	step(say("Six entries. And the database: "), 300),
	...readPhase("Inspecting the database", "r-db", "app.db", fileResult(DB_LISTING), { think: 460 }),
	step(say("The data model checks out. Peeking at the avatar asset: "), 300),
	...readPhase(
		"Reading the avatar",
		"r-img",
		"assets/avatar.png",
		fileResult("image/png · 512 × 512 · 84 KB · RGBA"),
		{
			think: 420,
		},
	),
	...readPhase(
		"Fetching the docs page",
		"r-url",
		"https://example.com/docs/intro",
		fileResult(URL_DOC, {
			kind: "url",
			contentType: "text/html; charset=utf-8",
			method: "GET",
			finalUrl: "https://example.com/docs/intro",
			truncation: { artifactId: "a1b2c3" },
		}),
		{ think: 460 },
	),
	step(say("Quick cross-check of the rate limiter — implementation, test, and store: "), 320),
	...readPhase("Reading rate limiter", "rg-core", "src/lib/rateLimit.ts", fileResult(RL_CORE), { think: 360 }),
	...readPhase("Reading the test", "rg-test", "src/lib/rateLimit.test.ts", fileResult(RL_TEST), { think: 300 }),
	...readPhase("Reading the store", "rg-store", "src/lib/store.ts", fileResult(RL_STORE), { think: 300 }),
	step(say("All three are wired correctly. "), 320),
	step(say("A few selector variations — a line range: "), 320),
	...readPhase("Reading a range", "s-range", "src/auth/login.ts:50-100", fileResult(RANGE_CODE), { think: 320 }),
	step(say("raw bytes: "), 280),
	...readPhase("Reading raw", "s-raw", "config.json:raw", fileResult(RAW_JSON), { think: 280 }),
	step(say("a git-conflict index: "), 280),
	...readPhase(
		"Reading conflicts",
		"s-conf",
		"src/merge.ts:conflicts",
		fileResult(CONFLICT_INDEX, { conflictCount: 2 }),
		{
			think: 300,
		},
	),
	step(say("Opening block #1 to resolve it: "), 280),
	...readPhase(
		"Inspecting conflict #1",
		"s-conf-1",
		"conflict://1",
		{
			content: [{ type: "text", text: CONFLICT_BLOCK }],
			details: { displayContent: { text: CONFLICT_BLOCK, startLine: 12 }, resolvedPath: "src/merge.ts" },
		},
		{ think: 320 },
	),
	step(say("and a table schema: "), 280),
	...readPhase("Reading schema", "s-schema", "app.db:users", fileResult(SCHEMA_SQL), { think: 300 }),
	step(say("Selectors and sub-modes all render. "), 320),
	step(say("Finally, the secrets file: "), 300),
	...readPhase(
		"Reading secrets",
		"r-err",
		"src/config/secrets.ts",
		fileResult("ENOENT: no such file or directory, open 'src/config/secrets.ts'"),
		{ success: false, think: 420, run: 520 },
	),
	step(say("That one isn't committed — expected. Tour complete."), 360),
	step(completed(), 220),
];

export const readDemoScript: DemoScript = {
	snapshot: SNAPSHOT,
	intro: INTRO,
	defaultReply: {
		steps: [
			step(verb("Reading"), 240),
			...readPhase("Reading a file", "r-followup", "src/auth/login.ts", fileResult(CODE_TS), { think: 420 }),
			step(say("Scripted read-demo driver — attach a real engine to read live files."), 320),
			step(completed(), 200),
		],
	},
};
