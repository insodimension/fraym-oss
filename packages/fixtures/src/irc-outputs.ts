// irc tool fixtures — agent-to-agent messaging results.
// Each variation produces realistic IrcDetails-shaped data.

export type IrcVariation = "list" | "send" | "send-no-reply" | "send-failed" | "error";

// ─── List · show live agents ───────────────────────────────────────────

export const LIST_INPUT = { op: "list" };

export const LIST_DETAILS = {
	op: "list",
	from: "agent-sam",
	peers: [
		{ id: "agent-alex", displayName: "Alex", kind: "task", status: "idle" },
		{ id: "agent-jo", displayName: "Jo", kind: "task", status: "running" },
		{ id: "agent-parker", displayName: "Parker", kind: "atlas-code", status: "idle" },
	],
	channels: ["all", "agent-alex", "agent-jo", "agent-parker"],
};

export const LIST_OUTPUT =
	"3 peer(s):\n- agent-alex [Alex · task · idle]\n- agent-jo [Jo · task · running]\n- agent-parker [Parker · atlas-code · idle]";

// ─── Send · message delivered with reply ───────────────────────────────

export const SEND_INPUT = {
	op: "send",
	to: "agent-jo",
	message: "Can you review the pipeline results?",
	awaitReply: true,
};

export const SEND_DETAILS = {
	op: "send",
	from: "agent-sam",
	to: "agent-jo",
	delivered: ["agent-jo"],
	replies: [
		{
			from: "agent-jo",
			text: "On it! Pipeline looks good — 48/50 tests passed. The 2 failures are known flaky ones.",
		},
	],
};

export const SEND_OUTPUT =
	"Delivered to 1 peer(s): agent-jo\n\n## Replies\n\n### agent-jo\nOn it! Pipeline looks good — 48/50 tests passed. The 2 failures are known flaky ones.";

// ─── Send no-reply · delivered, no reply ───────────────────────────────

export const SEND_NO_REPLY_INPUT = {
	op: "send",
	to: "agent-alex",
	message: "Deploy the latest build.",
	awaitReply: false,
};

export const SEND_NO_REPLY_DETAILS = {
	op: "send",
	from: "agent-sam",
	to: "agent-alex",
	delivered: ["agent-alex"],
};

export const SEND_NO_REPLY_OUTPUT = "Delivered to 1 peer(s): agent-alex";

// ─── Send failed · delivery failure ────────────────────────────────────

export const SEND_FAILED_INPUT = { op: "send", to: "agent-zoe", message: "Are you there?" };

export const SEND_FAILED_DETAILS = {
	op: "send",
	from: "agent-sam",
	to: "agent-zoe",
	delivered: [],
	failed: [{ id: "agent-zoe", error: "Timeout: agent-zoe did not respond within 120s" }],
	notFound: [],
};

export const SEND_FAILED_OUTPUT =
	"No recipients received the message.\n\n## Failed\n\n- agent-zoe: Timeout: agent-zoe did not respond within 120s";

// ─── Error · IRC unavailable ──────────────────────────────────────────

export const ERROR_INPUT = { op: "send", to: "agent-jo", message: "hello" };
export const ERROR_TEXT = "IRC is unavailable in this session.";

// ─── Derived maps ──────────────────────────────────────────────────────

export const IRC_INPUT: Record<string, Record<string, unknown>> = {
	list: LIST_INPUT,
	send: SEND_INPUT,
	"send-no-reply": SEND_NO_REPLY_INPUT,
	"send-failed": SEND_FAILED_INPUT,
	error: ERROR_INPUT,
};

export const IRC_DETAILS: Record<string, Record<string, unknown>> = {
	list: LIST_DETAILS as unknown as Record<string, unknown>,
	send: SEND_DETAILS as unknown as Record<string, unknown>,
	"send-no-reply": SEND_NO_REPLY_DETAILS as unknown as Record<string, unknown>,
	"send-failed": SEND_FAILED_DETAILS as unknown as Record<string, unknown>,
	error: {},
};

export const IRC_OUTPUT_TEXT: Record<string, string | undefined> = {
	list: LIST_OUTPUT,
	send: SEND_OUTPUT,
	"send-no-reply": SEND_NO_REPLY_OUTPUT,
	"send-failed": SEND_FAILED_OUTPUT,
	error: ERROR_TEXT,
};
