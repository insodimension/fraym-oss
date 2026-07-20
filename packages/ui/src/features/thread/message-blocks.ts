import type { TranscriptBlock } from "../../hooks/session-types";
import type { MessageBlock } from "../message/message";

/** Map a driver transcript block to a registry-rendered message block. */
export function toMessageBlock(block: TranscriptBlock): MessageBlock {
	if (block.type === "tool") return { type: "tool", call: block.call };
	if (block.type === "command")
		return { type: block.renderKind, command: block.command, text: block.text, invocation: block.invocation };
	if (block.type === "tokenUsage") return { type: "tokenUsage", usage: block.usage };
	if (block.type === "image") return { type: "image", src: block.src, alt: block.alt, caption: block.caption };
	if (block.type === "notice")
		return { type: "notice", level: block.level, message: block.message, source: block.source };
	return { type: block.type, text: block.text };
}
