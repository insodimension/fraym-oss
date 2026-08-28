import { memo, type ReactNode, useMemo, useRef } from "react";
import { cn } from "../lib/cn";
import { canSyntaxHighlight, HighlightedCode } from "./code-block";
import { CopyButton } from "./copy-button";
import { FileMentionPill, looksLikeFilePath, renderTextWithMentions } from "./file-mention";
import { PlainCodeBlock } from "./plain-code-block";
import { SessionLink } from "./session-link";

export interface StaticMarkdownLiteProps {
	readonly text: string;
	readonly className?: string;
}

const INLINE_PATTERN = /(`[^`]+`|\*\*[^*]+\*\*)/g;
const LINK_PATTERN = /(!?)\[([^\]]*)\]\(([^)\s]+)\)/g;
const BULLET_PATTERN = /^\s*[-*+]\s+/;
const NUMBER_PATTERN = /^\s*\d+\.\s+/;
const HEADING_PATTERN = /^\s{0,3}(#{1,6})\s+(.+)$/;
const QUOTE_PATTERN = /^\s{0,3}>\s?/;
const RULE_PATTERN = /^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/;
const FENCE_START_PATTERN = /^\s{0,3}(```|~~~)\s*([^\s`]*)?.*$/;
const FENCE_END_PATTERN = /^\s{0,3}(```|~~~)\s*$/;
const TABLE_SEPARATOR_PATTERN = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?\s*$/;
const TASK_PATTERN = /^\s*[-*+]\s+\[([ xX])\]\s+/;
const SETEXT_H1_PATTERN = /^\s{0,3}=+\s*$/;
const SETEXT_H2_PATTERN = /^\s{0,3}-+\s*$/;

function safeHref(value: string): string | undefined {
	if (/^(https?:|mailto:|#|\/)/i.test(value)) return value;
	return undefined;
}

const SESSION_HREF_PATTERN = /^session:\/\/([^/\s]+)\/(\S+)$/i;

/** Parse a `session://<workspaceId>/<sessionId>` link (emitted by search_sessions)
 *  so agent prose renders it as a clickable "Open session" chip instead of inert
 *  text — safeHref() rejects the non-http scheme, so without this the link is dead.
 *  workspaceId is the first path segment; the (slash-free in practice) remainder is
 *  the sessionId. Exported for direct unit coverage. */
export function parseSessionHref(value: string): { workspaceId: string; sessionId: string } | null {
	const match = SESSION_HREF_PATTERN.exec(value.trim());
	if (!match) return null;
	const [, workspaceId, sessionId] = match;
	return workspaceId && sessionId ? { workspaceId, sessionId } : null;
}

/** Image sources we render inline: web URLs, root-relative paths, and pasted
 *  `data:image/*` blobs (screenshots in a note). Anything else falls back to text. */
function safeImageSrc(value: string): string | undefined {
	if (/^(https?:\/\/|\/|data:image\/)/i.test(value)) return value;
	return undefined;
}

const BARE_URL_PATTERN = /\b(?:https?|session):\/\/[^\s<>{}"'`]+/g;

// Tool output commonly labels a workspace file as `Lives at: path/to/file` without
// markdown backticks. Recognize only that explicit label, then reuse the same
// conservative path gate and host-backed file pill as `@path`/inline-code mentions.
const LABELED_FILE_PATTERN = /\b(Lives at:\s+)([^\s`()[\]{}<>|*?;,=]+)/gi;

function labeledFileNodes(text: string, keyPrefix: string): ReactNode[] {
	const nodes: ReactNode[] = [];
	let lastIndex = 0;
	LABELED_FILE_PATTERN.lastIndex = 0;
	let match = LABELED_FILE_PATTERN.exec(text);
	while (match) {
		if (match.index > lastIndex)
			nodes.push(...renderTextWithMentions(text.slice(lastIndex, match.index), `${keyPrefix}-${match.index}`));
		const label = match[1] ?? "";
		const path = match[2] ?? "";
		if (looksLikeFilePath(path)) {
			nodes.push(label);
			nodes.push(<FileMentionPill key={`${keyPrefix}-file-${match.index}`} path={path} fallback={path} />);
		} else {
			nodes.push(match[0]);
		}
		lastIndex = match.index + match[0].length;
		match = LABELED_FILE_PATTERN.exec(text);
	}
	if (lastIndex < text.length) nodes.push(...renderTextWithMentions(text.slice(lastIndex), `${keyPrefix}-end`));
	return nodes;
}

/** Strip trailing sentence punctuation and unbalanced closing brackets a bare URL
 *  swept up from prose (e.g. "...see https://x.com/y." or "(https://x.com/y)"). */
function trimUrlTrailer(raw: string): { href: string; trailer: string } {
	let href = raw;
	let trailer = "";
	for (;;) {
		const last = href.at(-1);
		if (last === undefined) break;
		if (".,;:!?".includes(last)) {
			trailer = last + trailer;
			href = href.slice(0, -1);
			continue;
		}
		if (last === ")" && (href.match(/\(/g)?.length ?? 0) < (href.match(/\)/g)?.length ?? 0)) {
			trailer = last + trailer;
			href = href.slice(0, -1);
			continue;
		}
		if (last === "]" && (href.match(/\[/g)?.length ?? 0) < (href.match(/\]/g)?.length ?? 0)) {
			trailer = last + trailer;
			href = href.slice(0, -1);
			continue;
		}
		break;
	}
	return { href, trailer };
}

/** Split plain text on bare `http(s)://` URLs (GFM-style autolink) so pasted/typed
 *  links become clickable even outside `[text](url)` markdown syntax — the common
 *  case for agent prose that just drops a raw URL. Remaining text still routes
 *  through `renderTextWithMentions` for `@file` pills. */
function autolinkNodes(text: string, keyPrefix: string): ReactNode[] {
	const nodes: ReactNode[] = [];
	let lastIndex = 0;
	BARE_URL_PATTERN.lastIndex = 0;
	let match = BARE_URL_PATTERN.exec(text);
	while (match) {
		if (match.index > lastIndex)
			nodes.push(...labeledFileNodes(text.slice(lastIndex, match.index), `${keyPrefix}-${match.index}`));
		const { href, trailer } = trimUrlTrailer(match[0]);
		const session = parseSessionHref(href);
		nodes.push(
			session ? (
				<SessionLink
					key={`${keyPrefix}-session-${match.index}`}
					workspaceId={session.workspaceId}
					sessionId={session.sessionId}
				/>
			) : (
				<a
					key={`${keyPrefix}-url-${match.index}`}
					href={href}
					target="_blank"
					rel="noopener noreferrer"
					className="text-fr-accent underline underline-offset-2"
				>
					{href}
				</a>
			),
		);
		if (trailer) nodes.push(trailer);
		lastIndex = match.index + match[0].length;
		match = BARE_URL_PATTERN.exec(text);
	}
	if (lastIndex < text.length) nodes.push(...labeledFileNodes(text.slice(lastIndex), `${keyPrefix}-end`));
	return nodes;
}

function linkNodes(text: string, keyPrefix: string): ReactNode[] {
	const nodes: ReactNode[] = [];
	let lastIndex = 0;
	LINK_PATTERN.lastIndex = 0;
	let match = LINK_PATTERN.exec(text);

	while (match) {
		if (match.index > lastIndex)
			nodes.push(...autolinkNodes(text.slice(lastIndex, match.index), `${keyPrefix}-${match.index}`));
		const isImage = match[1] === "!";
		const label = match[2] ?? "";
		const target = match[3] ?? "";
		if (isImage) {
			// `![alt](src)` → an actual image (the whole point: never dump base64).
			const src = safeImageSrc(target);
			nodes.push(
				src ? (
					<img
						key={`${keyPrefix}-img-${match.index}`}
						src={src}
						alt={label}
						loading="lazy"
						className="my-2 block max-h-[440px] max-w-full rounded-[8px] border border-fr-border-soft"
					/>
				) : (
					label || match[0]
				),
			);
		} else {
			const session = parseSessionHref(target);
			if (session) {
				nodes.push(
					<SessionLink
						key={`${keyPrefix}-session-${match.index}`}
						workspaceId={session.workspaceId}
						sessionId={session.sessionId}
						{...(label ? { label } : {})}
					/>,
				);
			} else {
				const href = safeHref(target);
				nodes.push(
					href ? (
						<a
							key={`${keyPrefix}-link-${match.index}`}
							href={href}
							target="_blank"
							rel="noopener noreferrer"
							className="text-fr-accent underline underline-offset-2"
						>
							{label}
						</a>
					) : (
						match[0]
					),
				);
			}
		}
		lastIndex = match.index + match[0].length;
		match = LINK_PATTERN.exec(text);
	}

	if (lastIndex < text.length) nodes.push(...autolinkNodes(text.slice(lastIndex), `${keyPrefix}-end`));
	return nodes;
}

function inlineNodes(text: string): ReactNode[] {
	const nodes: ReactNode[] = [];
	let lastIndex = 0;
	INLINE_PATTERN.lastIndex = 0;
	let match = INLINE_PATTERN.exec(text);

	while (match) {
		if (match.index > lastIndex) nodes.push(...linkNodes(text.slice(lastIndex, match.index), `text-${lastIndex}`));
		const token = match[0];
		if (token.startsWith("`")) {
			const inner = token.slice(1, -1);
			const codeClass = "rounded-[5px] bg-fr-surface-2 px-[6px] py-px font-secondary text-fr-sm";
			nodes.push(
				looksLikeFilePath(inner) ? (
					<FileMentionPill
						key={`file-${match.index}`}
						path={inner}
						fallback={<code className={codeClass}>{inner}</code>}
					/>
				) : (
					<code key={`code-${match.index}`} className={codeClass}>
						{inner}
					</code>
				),
			);
		} else {
			nodes.push(
				<strong key={`strong-${match.index}`} className="font-semibold">
					{token.slice(2, -2)}
				</strong>,
			);
		}
		lastIndex = match.index + token.length;
		match = INLINE_PATTERN.exec(text);
	}

	if (lastIndex < text.length) nodes.push(...linkNodes(text.slice(lastIndex), `text-${lastIndex}`));
	return nodes;
}

function lineBreakNodes(text: string): ReactNode {
	return text.split("\n").map((line, index) => (
		<span key={index}>
			{index > 0 && <br />}
			{inlineNodes(line)}
		</span>
	));
}

function nonEmptyLines(block: string): string[] {
	return block.split("\n").filter(line => line.trim().length > 0);
}

function indentWidth(line: string): number {
	let width = 0;
	for (const ch of line) {
		if (ch === " ") width += 1;
		else if (ch === "\t") width += 2;
		else break;
	}
	return width;
}

/** A line that opens a list item — bullet, ordered, or GFM task (`- [ ]`). */
function isListLine(line: string): boolean {
	return BULLET_PATTERN.test(line) || NUMBER_PATTERN.test(line);
}

/** Constructs that (like headings/fences/tables) interrupt a paragraph with no
 *  blank line before them. */
function startsListOrQuote(line: string): boolean {
	return isListLine(line) || QUOTE_PATTERN.test(line);
}

interface ListItemInfo {
	readonly indent: number;
	readonly ordered: boolean;
	readonly start: number;
	/** null = not a task item; true/false = checked state. */
	readonly task: boolean | null;
	content: string;
}

function parseListLine(line: string): ListItemInfo | null {
	const indent = indentWidth(line);
	const task = TASK_PATTERN.exec(line);
	if (task) {
		const checked = (task[1] ?? "").toLowerCase() === "x";
		return { indent, ordered: false, start: 1, task: checked, content: line.replace(TASK_PATTERN, "") };
	}
	if (NUMBER_PATTERN.test(line)) {
		const parsed = Number.parseInt(/^\s*(\d+)\./.exec(line)?.[1] ?? "1", 10);
		const start = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
		return { indent, ordered: true, start, task: null, content: line.replace(NUMBER_PATTERN, "") };
	}
	if (BULLET_PATTERN.test(line)) {
		return { indent, ordered: false, start: 1, task: null, content: line.replace(BULLET_PATTERN, "") };
	}
	return null;
}

/** Parse a list block into items; a non-marker line is a lazy continuation of the
 *  previous item (its text is appended) so wrapped list text is never dropped. */
function parseListItems(block: string): ListItemInfo[] {
	const items: ListItemInfo[] = [];
	for (const line of nonEmptyLines(block)) {
		const parsed = parseListLine(line);
		if (parsed) {
			items.push(parsed);
			continue;
		}
		const last = items[items.length - 1];
		if (last) last.content += ` ${line.trim()}`;
	}
	return items;
}

function isList(block: string): boolean {
	const first = nonEmptyLines(block)[0];
	return first !== undefined && isListLine(first);
}

interface ListTreeNode {
	readonly item: ListItemInfo;
	readonly children: ListTreeNode[];
}

/** Build a nesting tree from a flat item list using indentation depth. */
function buildListTree(items: readonly ListItemInfo[]): ListTreeNode[] {
	const roots: ListTreeNode[] = [];
	const stack: ListTreeNode[] = [];
	for (const item of items) {
		const node: ListTreeNode = { item, children: [] };
		while (stack.length > 0 && (stack[stack.length - 1]?.item.indent ?? 0) >= item.indent) stack.pop();
		const parent = stack[stack.length - 1];
		if (parent) parent.children.push(node);
		else roots.push(node);
		stack.push(node);
	}
	return roots;
}

function renderListLevel(nodes: readonly ListTreeNode[], keyPrefix: string): ReactNode {
	if (nodes.length === 0) return null;
	const ordered = nodes[0]?.item.ordered ?? false;
	const isTask = nodes.some(node => node.item.task !== null);
	const start = ordered ? (nodes[0]?.item.start ?? 1) : 1;
	const items = nodes.map((node, index) => (
		<li key={index}>
			{node.item.task !== null ? (
				<input type="checkbox" defaultChecked={node.item.task} disabled className="mr-1.5 align-middle" />
			) : null}
			{inlineNodes(node.item.content)}
			{node.children.length > 0 ? renderListLevel(node.children, `${keyPrefix}-${index}`) : null}
		</li>
	));
	if (ordered) {
		return (
			<ol key={keyPrefix} start={start !== 1 ? start : undefined}>
				{items}
			</ol>
		);
	}
	return (
		<ul key={keyPrefix} style={isTask ? { listStyle: "none", paddingLeft: 0 } : undefined}>
			{items}
		</ul>
	);
}

function renderList(block: string, index: number): ReactNode {
	return renderListLevel(buildListTree(parseListItems(block)), `${index}`);
}

function isBlockquote(block: string): boolean {
	const lines = nonEmptyLines(block);
	return lines.length > 0 && lines.every(line => QUOTE_PATTERN.test(line));
}

/**
 * A resumable point in the block scan, plus the blocks and ReactNodes it produced.
 *
 * A streaming turn re-renders this parser with the WHOLE accumulated message on every
 * delta, so a scan from byte 0 each time is O(n²) per answer. The scan's entire state is
 * `(blocks, current, fence)`, and at any line where `current` is empty and no fence is
 * open the last two are trivial — so restarting there reproduces the rest byte for byte.
 * Blocks already pushed are never revisited by any branch below, which is what makes the
 * head reusable at all.
 */
interface ParseCheckpoint {
	/** The source text this checkpoint was produced from. */
	readonly text: string;
	/** Leading whitespace `trim()` removed — must match for the bodies to share a prefix. */
	readonly lead: number;
	/** Every block of `text`, in order. */
	readonly blocks: readonly string[];
	/** `blocks` rendered, 1:1 by position. Carried forward so the settled head keeps the
	 *  SAME element objects and React bails out of those subtrees. */
	readonly nodes: readonly ReactNode[];
	/** How many of `blocks` were already final at `offset`. */
	readonly settled: number;
	/** Offset into the trimmed body where a later append may resume the scan. */
	readonly offset: number;
}

/** Walk the trimmed `body` from `start`, appending blocks. Returns the last boundary the
 *  scan passed through, so an appended delta can resume from there. */
function scanBlocks(
	body: string,
	start: number,
	blocks: string[],
): { readonly settled: number; readonly offset: number } {
	const current: string[] = [];
	let fence: string | null = null;
	let settled = blocks.length;
	let offset = start;
	let cursor = start;

	for (const line of body.slice(start).split("\n")) {
		// Nothing pending and no open fence: everything pushed so far is final and this
		// line is a clean restart point for the next delta.
		if (current.length === 0 && fence === null) {
			settled = blocks.length;
			offset = cursor;
		}
		cursor += line.length + 1;

		const fenceStart = FENCE_START_PATTERN.exec(line);
		if (fenceStart && !fence) {
			// A fence may interrupt a paragraph (no blank line before it) — flush the
			// pending block first so codeFence() sees the fence as the block's first line
			// instead of absorbing it into the paragraph (which renders ``` literally).
			if (current.length > 0) {
				blocks.push(current.join("\n"));
				current.length = 0;
			}
			fence = fenceStart[1] ?? "```";
			current.push(line);
			continue;
		}
		if (fence && FENCE_END_PATTERN.test(line)) {
			current.push(line);
			blocks.push(current.join("\n"));
			current.length = 0;
			fence = null;
			continue;
		}
		if (!fence && line.trim() === "") {
			if (current.length > 0) {
				blocks.push(current.join("\n"));
				current.length = 0;
			}
			continue;
		}
		if (!fence && HEADING_PATTERN.test(line)) {
			if (current.length > 0) {
				blocks.push(current.join("\n"));
				current.length = 0;
			}
			blocks.push(line);
			continue;
		}
		if (!fence && current.length >= 2 && TABLE_SEPARATOR_PATTERN.test(line)) {
			// A table whose header row sits directly under a paragraph (no blank line
			// between them). The last accumulated line is the header; flush the prose
			// above it so the table — header + this separator + rows — forms its own
			// block that tableRows() can parse. Mirrors GFM (a table interrupts a paragraph).
			const header = current[current.length - 1] ?? "";
			blocks.push(current.slice(0, -1).join("\n"));
			current.length = 0;
			current.push(header, line);
			continue;
		}
		if (!fence && current.length > 0 && !startsListOrQuote(current[0] ?? "") && startsListOrQuote(line)) {
			// A list or blockquote directly under a paragraph (no blank line). Flush the
			// prose so the construct starts its own block — the same GFM rule the
			// heading/fence/table branches apply: any block opener interrupts a paragraph.
			blocks.push(current.join("\n"));
			current.length = 0;
		}
		if (
			!fence &&
			current.length > 0 &&
			!startsListOrQuote(current[0] ?? "") &&
			(SETEXT_H1_PATTERN.test(line) || SETEXT_H2_PATTERN.test(line))
		) {
			// Setext heading: prose underlined by === (h1) or --- (h2) with no blank line
			// between. Convert to the ATX form renderBlock already handles. (A bare --- with
			// a blank line above never reaches here — current is empty, so it stays a <hr>.)
			const level = SETEXT_H1_PATTERN.test(line) ? "#" : "##";
			blocks.push(`${level} ${current.join(" ").trim()}`);
			current.length = 0;
			continue;
		}
		current.push(line);
	}

	if (current.length > 0) blocks.push(current.join("\n"));
	return { settled, offset };
}

/**
 * Split `text` into blocks and render them, resuming from `prev` when `text` merely
 * APPENDS to it (the streaming case).
 *
 * Reuse needs the two trimmed bodies to share a prefix through `prev.offset`. That holds
 * exactly when `text` starts with `prev.text` and the leading trim is unchanged: the
 * trailing trim only ever removes characters at the very end, which is at or after the
 * last block boundary. Any other change (an edit, a reset, a different message) fails the
 * guard and falls back to a full parse, so the output is always what a cold parse produces.
 *
 * The reused head keeps its EXISTING element objects — React skips a child whose element
 * is reference-identical (`oldProps === newProps`), so the settled part of a streaming
 * message costs nothing to re-render after its first paint. Elements are immutable
 * descriptors, so holding them across renders is safe.
 */
function parseBlocks(text: string, prev: ParseCheckpoint | null): ParseCheckpoint {
	const lead = text.length - text.trimStart().length;
	const body = text.trim();
	let blocks: string[] = [];
	let nodes: ReactNode[] = [];
	let start = 0;
	if (
		prev !== null &&
		prev.text.length > 0 &&
		prev.lead === lead &&
		prev.offset <= body.length &&
		text.startsWith(prev.text)
	) {
		blocks = prev.blocks.slice(0, prev.settled);
		nodes = prev.nodes.slice(0, prev.settled);
		start = prev.offset;
	}
	const { settled, offset } = scanBlocks(body, start, blocks);
	for (let i = nodes.length; i < blocks.length; i++) nodes.push(renderBlock(blocks[i] as string, i));
	return { text, lead, blocks, nodes, settled, offset };
}

function codeFence(block: string): { readonly code: string; readonly language: string } | null {
	const lines = block.split("\n");
	if (lines.length < 2) return null;
	const start = FENCE_START_PATTERN.exec(lines[0] ?? "");
	if (!start) return null;
	const fence = start[1];
	const end = FENCE_END_PATTERN.exec(lines[lines.length - 1] ?? "");
	if (!end || end[1] !== fence) return null;
	return {
		language: start[2] ?? "",
		code: lines.slice(1, -1).join("\n"),
	};
}

function tableRows(block: string): readonly (readonly string[])[] | null {
	const lines = nonEmptyLines(block);
	if (lines.length < 2 || !TABLE_SEPARATOR_PATTERN.test(lines[1] ?? "")) return null;
	return lines
		.filter((_, index) => index !== 1)
		.map(line =>
			line
				.trim()
				.replace(/^\|/, "")
				.replace(/\|$/, "")
				.split("|")
				.map(cell => cell.trim()),
		);
}

function renderTable(rows: readonly (readonly string[])[], index: number): ReactNode {
	const [head, ...body] = rows;
	if (!head) return null;
	return (
		<div key={index} className="my-2 max-w-full overflow-x-auto">
			<table className="w-full border-collapse text-fr-sm">
				<thead>
					<tr>
						{head.map((cell, cellIndex) => (
							<th
								key={cellIndex}
								className="border-b border-fr-border px-2.5 py-1.5 text-left font-medium text-fr-text-2"
							>
								{inlineNodes(cell)}
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{body.map((row, rowIndex) => (
						<tr key={rowIndex}>
							{row.map((cell, cellIndex) => (
								<td key={cellIndex} className="border-b border-fr-border-soft px-2.5 py-1.5 align-top">
									{inlineNodes(cell)}
								</td>
							))}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

/** A fenced prose code block with a hover copy-to-clipboard control (top-right). */
function LiteCodeBlock({ code, language }: { readonly code: string; readonly language: string }): ReactNode {
	const codeClassName = language ? `language-${language}` : undefined;
	return (
		<div className="group relative my-2 rounded-[8px] border border-fr-border-soft bg-fr-surface px-3 py-2">
			<div className="absolute right-2 top-2 z-10 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
				<CopyButton value={code} label="Copy code" />
			</div>
			{canSyntaxHighlight(code, language) ? (
				<HighlightedCode
					code={code}
					language={language}
					{...(codeClassName !== undefined ? { codeClassName } : {})}
				/>
			) : (
				<PlainCodeBlock code={code} {...(codeClassName !== undefined ? { codeClassName } : {})} />
			)}
		</div>
	);
}

function renderBlock(block: string, index: number): ReactNode {
	const trimmed = block.trim();
	const fence = codeFence(trimmed);
	if (fence) {
		const { code, language } = fence;
		return <LiteCodeBlock key={index} code={code} language={language} />;
	}
	const rows = tableRows(trimmed);
	if (rows) return renderTable(rows, index);
	const heading = HEADING_PATTERN.exec(trimmed);
	if (heading) {
		const level = Math.min(3, heading[1]?.length ?? 3);
		const Tag = `h${level}` as "h1" | "h2" | "h3";
		return (
			<Tag key={index} className="mt-3 mb-1.5 font-semibold">
				{inlineNodes(heading[2] ?? "")}
			</Tag>
		);
	}
	if (RULE_PATTERN.test(trimmed)) return <hr key={index} className="my-3 border-fr-border-soft" />;
	if (isList(block)) return renderList(block, index);
	if (isBlockquote(block)) {
		const quoteText = block
			.split("\n")
			.map(line => line.replace(QUOTE_PATTERN, ""))
			.join("\n");
		return (
			<blockquote key={index} className="my-2 border-l-2 border-fr-border-soft pl-3 text-fr-text-2">
				{lineBreakNodes(quoteText)}
			</blockquote>
		);
	}
	return <p key={index}>{lineBreakNodes(block)}</p>;
}

function staticMarkdownLitePropsEqual(prev: StaticMarkdownLiteProps, next: StaticMarkdownLiteProps): boolean {
	return prev.text === next.text && prev.className === next.className;
}

export const StaticMarkdownLite = memo(function StaticMarkdownLite({ text, className }: StaticMarkdownLiteProps) {
	// Streaming re-renders this with the whole accumulated message per delta. The
	// checkpoint resumes the block scan at the last completed block instead of rescanning
	// from byte 0 and carries the head's already-rendered elements forward, so React skips
	// those subtrees — per-delta work is the tail, not the message.
	//
	// Writing the ref from the memo is safe: every checkpoint is derived purely from its
	// own `text` and is only reused when the new text APPENDS to it, so a StrictMode
	// double-render (or a render of stale text) still yields a cold-parse-identical result.
	const checkpoint = useRef<ParseCheckpoint | null>(null);
	const blocks = useMemo(() => {
		const next = parseBlocks(text, checkpoint.current);
		checkpoint.current = next;
		return next.nodes;
	}, [text]);
	return (
		<div
			className={cn(
				"break-words text-fr-base leading-[1.6]",
				"[&>:first-child]:mt-0 [&>:last-child]:mb-0",
				"[&_p]:mb-[14px] [&_p:last-child]:mb-0",
				"[&_ol]:my-[6px] [&_ol]:mb-[14px] [&_ol]:list-decimal [&_ol]:pl-5",
				"[&_ul]:my-[6px] [&_ul]:mb-[14px] [&_ul]:list-disc [&_ul]:pl-5",
				"[&_li]:mb-[6px] [&_li]:pl-1 [&_li::marker]:text-fr-text-3",
				"[&_strong]:font-semibold",
				className,
			)}
		>
			{blocks}
		</div>
	);
}, staticMarkdownLitePropsEqual);
