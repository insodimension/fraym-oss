import type { ReactNode } from "react";
import { Badge } from "../../../elements/badge";
import type { ActiveToolCall } from "../../../hooks/session-types";
import {
	asText,
	readField,
	readResultContentText,
	readStringField,
	toTermLines,
} from "../../../registries/default-renderer-utils";
import type { ToolRenderer, ToolView } from "../../../registries/tool-renderer-registry";
import { ToolBodySection } from "../tool-body-card";
import { ToolBodyTerm } from "../tool-card";
import { EditErrorBody } from "./bodies/edit-diff-body";

interface IrcReply {
	from: string;
	text: string;
}

function parseReplies(details: unknown): IrcReply[] {
	const raw = readField(details, "replies");
	if (!Array.isArray(raw)) return [];
	return raw
		.filter((reply): reply is Record<string, unknown> => typeof reply === "object" && reply !== null)
		.map(reply => ({
			from: readStringField(reply, "from") ?? "",
			text: readStringField(reply, "text") ?? "",
		}));
}

function parseFailed(details: unknown): string[] {
	const raw = readField(details, "failed");
	if (!Array.isArray(raw)) return [];
	return raw.map((failure: unknown) => {
		if (typeof failure === "string") return failure;
		if (typeof failure !== "object" || failure === null) return String(failure);
		const id = readStringField(failure as Record<string, unknown>, "id") ?? "";
		const error = readStringField(failure as Record<string, unknown>, "error") ?? "";
		return `${id}: ${error}`;
	});
}

function parseNotFound(details: unknown): string[] {
	const raw = readField(details, "notFound");
	return Array.isArray(raw) ? raw.filter((name): name is string => typeof name === "string") : [];
}

function parsePeers(details: unknown): Record<string, unknown>[] {
	const raw = readField(details, "peers");
	return Array.isArray(raw)
		? raw.filter((peer): peer is Record<string, unknown> => typeof peer === "object" && peer !== null)
		: [];
}

function ircBadges(op: string, to: string | undefined, awaitReply: unknown): ReactNode[] {
	const badges: ReactNode[] = [
		<Badge key="op" variant="code" tone={op === "send" ? "accent" : "mute"}>
			{op}
		</Badge>,
	];
	if (to) {
		badges.push(
			<Badge key="to" variant="code" tone="blue">
				to={to}
			</Badge>,
		);
	}
	if (awaitReply === false) {
		badges.push(
			<Badge key="no-reply" variant="code" tone="warn">
				no-reply
			</Badge>,
		);
	}
	return badges;
}

function ircStatus({
	running,
	isError,
	failed,
	replies,
}: {
	readonly running: boolean;
	readonly isError: boolean;
	readonly failed: readonly string[];
	readonly replies: readonly IrcReply[];
}): Pick<ToolView, "status" | "stat"> {
	if (running) return { status: "pending", stat: "waiting…" };
	if (isError) return { status: "error", stat: "failed" };
	if (failed.length > 0 && replies.length === 0) return { status: "error", stat: "failed" };
	if (failed.length > 0) return { status: "warn", stat: "partial" };
	return { status: "success" };
}

function messageLines(sendMessage: string | undefined): string[] {
	if (!sendMessage) return [];
	return [`> ${sendMessage.split("\n").join("\n> ")}`, ""];
}

function deliveryLines(op: string, details: unknown): string[] {
	if (op !== "send") return [];
	const delivered = readField(details, "delivered");
	const deliveredArr = Array.isArray(delivered) ? (delivered as string[]) : [];
	if (deliveredArr.length > 0) {
		return [`\u2713 Delivered to ${deliveredArr.length} peer(s): ${deliveredArr.join(", ")}`];
	}
	return ["\u2717 No recipients received the message."];
}

function replyLines(replies: readonly IrcReply[]): string[] {
	return replies.flatMap(reply => [
		"",
		`Reply from ${reply.from}:`,
		...reply.text.split("\n").map(line => `  ${line}`),
	]);
}

function failedLines(failed: readonly string[]): string[] {
	return failed.flatMap(item => ["", `\u2717 ${item}`]);
}

function notFoundLines(notFound: readonly string[]): string[] {
	return notFound.length > 0 ? ["", `? Unknown peers: ${notFound.join(", ")}`] : [];
}

function peerLines(peers: readonly Record<string, unknown>[]): string[] {
	if (peers.length === 0) return [];
	return [
		`\n${peers.length} peer(s):`,
		...peers.map(peer => {
			const id = readStringField(peer, "id") ?? "";
			const displayName = readStringField(peer, "displayName") ?? "";
			const kind = readStringField(peer, "kind") ?? "";
			const peerStatus = readStringField(peer, "status") ?? "";
			return `  ${id} [${displayName} \u00b7 ${kind} \u00b7 ${peerStatus}]`;
		}),
	];
}

function ircLines({
	op,
	details,
	sendMessage,
	replies,
	failed,
	notFound,
	peers,
}: {
	readonly op: string;
	readonly details: unknown;
	readonly sendMessage: string | undefined;
	readonly replies: readonly IrcReply[];
	readonly failed: readonly string[];
	readonly notFound: readonly string[];
	readonly peers: readonly Record<string, unknown>[];
}): string[] {
	return [
		...messageLines(sendMessage),
		...deliveryLines(op, details),
		...replyLines(replies),
		...failedLines(failed),
		...notFoundLines(notFound),
		...peerLines(peers),
	];
}

function ircBody({
	op,
	details,
	isError,
	sendMessage,
	replies,
	failed,
	notFound,
	peers,
	output,
}: {
	readonly op: string;
	readonly details: unknown;
	readonly isError: boolean;
	readonly sendMessage: string | undefined;
	readonly replies: readonly IrcReply[];
	readonly failed: readonly string[];
	readonly notFound: readonly string[];
	readonly peers: readonly Record<string, unknown>[];
	readonly output: unknown;
}): ReactNode {
	if (isError) {
		const text = readResultContentText(output) ?? asText(output) ?? "request failed";
		return <EditErrorBody message={text} />;
	}
	if (op === "list" && peers.length === 0) {
		return <div className="px-1 py-2 font-secondary text-fr-xs text-fr-text-3">No other live agents.</div>;
	}
	return (
		<ToolBodySection title={op === "list" ? "Peers" : "Message"} padContent maxHeight={350}>
			<ToolBodyTerm
				lines={toTermLines(ircLines({ op, details, sendMessage, replies, failed, notFound, peers }).join("\n"))}
			/>
		</ToolBodySection>
	);
}

const renderIrc: ToolRenderer = (call: ActiveToolCall): ToolView => {
	const details = readField(call.output, "details") as unknown;
	const input = call.input as Record<string, unknown> | undefined;
	const op = readStringField(input, "op") ?? "?";
	const running = call.status === "running";
	const isError = call.status === "error" || readField(call.output, "isError") === true;
	const replies = parseReplies(details);
	const failed = parseFailed(details);
	const notFound = parseNotFound(details);
	const peers = parsePeers(details);
	return {
		kind: "irc",
		label: "IRC",
		badges: ircBadges(op, readStringField(input, "to"), readField(input, "awaitReply")),
		...ircStatus({ running, isError, failed, replies }),
		bodyVariant: isError || (op === "list" && peers.length === 0) ? "term" : undefined,
		body: ircBody({
			op,
			details,
			isError,
			sendMessage: readStringField(details, "message") ?? readStringField(input, "message"),
			replies,
			failed,
			notFound,
			peers,
			output: call.output,
		}),
	};
};

export { renderIrc };
