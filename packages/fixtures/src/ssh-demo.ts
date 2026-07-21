// SSH demo script — an `ssh`-focused conversation expressed as pure session-driver
// events. Replayed through @fraym-ai/driver/mock so the ssh tool renders inside a real
// thread via the production renderer (`renderSsh`). Walks the remote-exec shapes: a
// quick remote command, a long STREAMED command (output follows the tail), a failure
// (service down / nonzero exit), and a truncated command (artifact spill).
//
// SSH shows an "SSH" head + a `[host]` badge + the `$ command` row + the streamed
// remote output on the term surface. Output rides the partial-output channel while
// streaming (`partialResult` stored as `call.output`); details carry only
// `meta.truncation` (NO wallTimeMs — unlike bash). Pure data: no JSX, no fraym-ui.

import type { SessionRef, SessionSnapshot, WorkspaceRef } from "@fraym-ai/driver";
import type { DemoScript, ScriptedEvent, ScriptStep } from "@fraym-ai/driver/mock";
import { assistantDelta as say, queuedMessage, runCompleted, scriptedStep as step, toolFinished as toolDone, toolStarted, toolUpdated as toolUpdate, workingStatus as verb } from "./scripted-event-utils";
import { toolResult } from "./tool-call-utils";

const NOW = "2026-06-05T12:00:00.000Z";

const WORKSPACE: WorkspaceRef = {
	workspaceId: "fraym-ssh",
	path: "/work/fraym-ssh",
	displayName: "fraym-ssh",
};

const REF: SessionRef = { workspaceId: "fraym-ssh", sessionId: "demo-ssh" };

const SNAPSHOT: SessionSnapshot = {
	ref: REF,
	workspace: WORKSPACE,
	title: "Check the staging box + tail the deploy",
	status: "idle",
	updatedAt: NOW,
	contextUsage: { tokens: 16_400, contextWindow: 200_000, percent: 0.082 },
	config: { provider: "acme", modelId: "Opus 4.6", thinkingLevel: "high" },
};

function userMessage(id: string, text: string): ScriptedEvent {
	return queuedMessage(id, text, NOW);
}

function toolStart(callId: string, input: unknown): ScriptedEvent {
	return toolStarted(callId, "ssh", input);
}

function completed(): ScriptedEvent {
	return runCompleted(SNAPSHOT);
}

/** Reveal cutoffs (line counts) for streaming output in ~`chunks` growing slices. */
function revealStops(lineCount: number, chunks: number, start: number): number[] {
	const stops: number[] = [];
	const span = Math.max(1, lineCount - start);
	for (let i = 1; i <= chunks; i++) {
		const n = start + Math.round((span * i) / chunks);
		if (n > (stops.at(-1) ?? start) && n < lineCount) stops.push(n);
	}
	return stops;
}

// --- phases -----------------------------------------------------------------

/** A static ssh phase: verb → the card appears running → it resolves. */
function sshPhase(
	message: string,
	callId: string,
	input: unknown,
	output: unknown,
	opts: { success?: boolean; think?: number; run?: number } = {},
): ScriptStep[] {
	return [
		step(verb(message), 260),
		step(toolStart(callId, input), opts.think ?? 560),
		step(toolDone(callId, output, opts.success ?? true), opts.run ?? 540),
	];
}

function sshPartialUpdate(callId: string, lines: readonly string[], lineCount: number, delayMs: number): ScriptStep {
	return step(
		toolUpdate(callId, { content: [{ type: "text", text: lines.slice(0, lineCount).join("\n") }] }),
		delayMs,
	);
}

/** A streaming ssh run: remote stdout reveals in growing chunks via the partial channel
 *  (`content[].text`), the output pane follows the tail, then it resolves. */
function sshStreamPhase(
	message: string,
	callId: string,
	input: unknown,
	fullOutput: string,
	finalDetails: Record<string, unknown>,
	opts: { think?: number; tick?: number; run?: number } = {},
): ScriptStep[] {
	const lines = fullOutput.split("\n");
	const stops = [...revealStops(lines.length, 12, 2), lines.length];
	const tickMs = opts.tick ?? 200;
	return [
		step(verb(message), 260),
		step(toolStart(callId, input), opts.think ?? 480),
		...stops.map(n => sshPartialUpdate(callId, lines, n, tickMs)),
		step(toolDone(callId, toolResult(fullOutput, finalDetails)), opts.run ?? 520),
	];
}

// --- realistic remote output ------------------------------------------------

const G = "\u001b[32m"; // green
const R = "\u001b[31m"; // red
const D = "\u001b[2m"; //  dim
const X = "\u001b[0m"; //  reset

const UPTIME_OUTPUT = [
	" 12:04:18 up 37 days,  4:11,  2 users,  load average: 0.18, 0.27, 0.31",
	`${D}              total        used        free      shared  buff/cache   available${X}`,
	`Mem:           31Gi        9.4Gi        2.1Gi       412Mi         19Gi         21Gi`,
	`Swap:         2.0Gi          0B        2.0Gi`,
].join("\n");

// A ~36-line deploy log so the streamed output overflows the scroll window and tails.
const DEPLOY_LOG = [
	`${D}==> pulling release bundle (build 4821)${X}`,
	...Array.from({ length: 30 }, (_, i) => `[${String(i + 1).padStart(2, "0")}/30] unpacked service/module_${i + 1}`),
	`${G}✓${X} migrated 14 pending changesets`,
	`${G}✓${X} restarted api.service (pid 20194)`,
	`${G}✓${X} health check passed (200 in 84ms)`,
	`${G}deploy complete — build 4821 live on staging-1${X}`,
].join("\n");

const SERVICE_DOWN = [
	`${R}● worker.service - Background job worker${X}`,
	"     Loaded: loaded (/etc/systemd/system/worker.service; enabled)",
	`     Active: ${R}failed${X} (Result: exit-code) since Thu 12:03:51 UTC`,
	"    Process: 19842 ExecStart=/usr/bin/worker (code=exited, status=1/FAILURE)",
	`${R}journal: FATAL: could not connect to redis at cache.example.test:6379 (connection refused)${X}`,
].join("\n");

// A long audit log that gets truncated server-side (artifact spill + trailing notice).
const AUDIT_LOG = `${Array.from(
	{ length: 40 },
	(_, i) =>
		`${D}${new Date(1_717_588_800_000 + i * 60_000).toISOString()}${X} sshd[${4000 + i}]: accepted publickey for deploy from 10.0.${i % 8}.${i + 2}`,
).join("\n")}

[Showing last 200 of 9000 lines. Full output at artifact://ssh-audit-7b3c]`;

// --- the conversation -------------------------------------------------------

const INTRO: ScriptStep[] = [
	step(
		userMessage(
			"u-ssh",
			"Check load on staging-1, then run the deploy and tail it. If the worker's down, show me why.",
		),
		200,
	),
	step(say("Checking the box first: "), 320),
	...sshPhase(
		"Checking uptime",
		"s-uptime",
		{ host: "staging-1", command: "uptime && free -h" },
		toolResult(UPTIME_OUTPUT),
	),
	step(say("Healthy — load's low. Kicking off the deploy and streaming the log: "), 340),
	...sshStreamPhase(
		"Deploying",
		"s-deploy",
		{ host: "staging-1", command: "sudo /opt/deploy/release.sh", cwd: "/opt/deploy", timeout: 600 },
		DEPLOY_LOG,
		{},
		{ think: 480 },
	),
	step(say("Build 4821 is live. You mentioned the worker — checking its status: "), 320),
	...sshPhase(
		"Worker status",
		"s-worker",
		{ host: "staging-1", command: "systemctl status worker.service" },
		toolResult(SERVICE_DOWN, {}, true),
		{ success: false, think: 460 },
	),
	step(say("Worker's down — redis is refusing connections. Pulling the auth audit log for context: "), 320),
	...sshPhase(
		"Tailing audit log",
		"s-audit",
		{ host: "staging-1", command: "journalctl -u ssh -n 9000" },
		toolResult(AUDIT_LOG, { meta: { truncation: { artifactId: "ssh-audit-7b3c" } } }),
		{ think: 440 },
	),
	step(
		say("Audit log spilled to an artifact (9000 lines). Redis is the culprit — restart it next. SSH tour complete."),
		360,
	),
	step(completed(), 220),
];

export const sshDemoScript: DemoScript = {
	snapshot: SNAPSHOT,
	intro: INTRO,
	defaultReply: {
		steps: [
			...sshPhase(
				"Restarting redis",
				"s-followup",
				{ host: "staging-1", command: "sudo systemctl restart redis && systemctl is-active redis" },
				toolResult(`${G}active${X}`),
				{ think: 420 },
			),
			step(say("Scripted ssh-demo driver — attach a real engine to run live remote commands."), 320),
			step(completed(), 200),
		],
	},
};
