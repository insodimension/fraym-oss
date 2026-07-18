// `browser` tool renderer — a headless-browser card (open / close / run).
//
// Engine's BrowserTool (engine .../tools/browser.ts) is stateful + multi-tab with three
// actions; its TUI renderer (`browserToolRenderer` in tools/browser/render.ts) has
// TWO shapes by `action`: `run` → a JS code cell (renderCodeCell, language js) +
// text output (preview 10 / expand ∞) + a truncation warning; `open`/`close` → a
// single status line (icon + title + meta + result text). It renders TEXT only —
// screenshots + `display()` figures live in `content[]` as inline image blocks
// (base64) and the TUI surfaces them via the terminal image protocol OUTSIDE the
// renderer. Fraym renders them inline as real <img> with a lightbox (`ImageBlock`)
// — parity+. `details.observation` is never populated by the handler (the a11y
// snapshot arrives as run returnValue text), and all non-image `display()` output
// is text (no structured JSON block). No result streaming (`_onUpdate` is unused).
// Registered for `browser` in default-tool-renderers. See docs/design/tools/browser.md.

import type { ReactNode } from "react";
import { Badge } from "../../../elements/badge";
import { PlainCodeBlock } from "../../../elements/plain-code-block";
import type { ActiveToolCall } from "../../../hooks/session-types";
import { readField, readStringField, toTermLines } from "../../../registries/default-renderer-utils";
import type { ToolRenderer, ToolView } from "../../../registries/tool-renderer-registry";
import { ImageBlock } from "../../message/messages/image-block";
import { ToolBodyCard, ToolBodySection } from "../tool-body-card";
import { ToolBodyTerm, type ToolStatus } from "../tool-card";
import { BashTruncationNote } from "./bodies/bash-body";

const BROWSER_BODY_MAX_HEIGHT = 240;
const BROWSER_IMAGE_MAX_HEIGHT = 240;

// --- defensive parse (local; no coupling to the monolith) -------------------

interface BrowserImage {
	readonly data: string;
	readonly mime: string;
}

/** Split an `AgentToolResult`-shaped output's `content[]` into joined text + every image block. */
function readBrowserContent(output: unknown): { text: string; images: BrowserImage[] } {
	const content = readField(output, "content");
	const texts: string[] = [];
	const images: BrowserImage[] = [];
	if (Array.isArray(content)) {
		for (const c of content) {
			const type = readStringField(c, "type");
			if (type === "text") {
				const t = readStringField(c, "text");
				if (t) texts.push(t);
			} else if (type === "image") {
				const data = readStringField(c, "data");
				if (data) images.push({ data, mime: readStringField(c, "mimeType") ?? "image/png" });
			}
		}
	} else if (typeof output === "string") {
		texts.push(output);
	}
	return { text: texts.join("\n").replace(/\s+$/, ""), images };
}

function shortenUrl(url: string): string {
	const stripped = url.replace(/^https?:\/\//, "");
	return stripped.length > 48 ? `${stripped.slice(0, 47)}…` : stripped;
}

type BrowserAction = "open" | "close" | "run";

interface BrowserRenderContext {
	readonly action: BrowserAction;
	readonly tab: string;
	readonly url: string | undefined;
	readonly browserKind: string | undefined;
	readonly code: string;
	readonly closeAll: boolean;
	readonly kill: boolean;
	readonly streaming: boolean;
	readonly isError: boolean;
	readonly truncated: boolean;
	readonly artifact: string | undefined;
	readonly text: string;
	readonly images: readonly BrowserImage[];
}

function readAction(call: ActiveToolCall, details: unknown): BrowserAction {
	const a = readStringField(details, "action") ?? readStringField(call.input, "action");
	return a === "close" || a === "run" ? a : "open";
}

/** Mirror the TUI `describeBrowser`: explicit app overrides, else `details.browser`. */
function describeBrowserKind(call: ActiveToolCall, details: unknown): string | undefined {
	const app = readField(call.input, "app");
	if (readStringField(app, "cdp_url")) return "connected";
	if (readStringField(app, "path")) return "spawned";
	return readStringField(details, "browser");
}

function readBrowserContext(call: ActiveToolCall): BrowserRenderContext {
	const details = readField(call.output, "details");
	const truncation = readField(readField(details, "meta"), "truncation");
	const truncated = truncation != null && truncation !== false;
	const artifactId = readStringField(truncation, "artifactId");
	const { text: rawText, images } = readBrowserContent(call.output);
	let text = rawText || (call.text ?? "").replace(/\s+$/, "");
	// Engine appends a trailing bracketed OutputMeta notice (`\n\n[…]`) on truncation — strip it.
	if (truncated) text = text.replace(/\n*\n\[[^\]]*\][ \t]*$/, "");
	return {
		action: readAction(call, details),
		tab: readStringField(details, "name") ?? readStringField(call.input, "name") ?? "main",
		url: readStringField(details, "url") ?? readStringField(call.input, "url"),
		browserKind: describeBrowserKind(call, details),
		code: readStringField(call.input, "code") ?? "",
		closeAll: readField(call.input, "all") === true,
		kill: readField(call.input, "kill") === true,
		streaming: call.status === "running",
		isError:
			call.status === "error" ||
			readField(call.output, "isError") === true ||
			readField(details, "isError") === true,
		truncated,
		artifact: artifactId ? `artifact://${artifactId}` : undefined,
		text,
		images,
	};
}

function buildBrowserBadges(ctx: BrowserRenderContext): ReactNode[] {
	const badges: ReactNode[] = [
		<Badge key="action" variant="code" tone="accent">
			{ctx.action}
		</Badge>,
		<Badge key="tab" variant="code" tone="mute">
			{ctx.action === "close" && ctx.closeAll ? "all tabs" : `tab "${ctx.tab}"`}
		</Badge>,
	];
	if (ctx.kill) {
		badges.push(
			<Badge key="kill" variant="code" tone="del">
				kill
			</Badge>,
		);
	}
	if (ctx.browserKind) {
		badges.push(
			<Badge key="kind" variant="code" tone="mute">
				{ctx.browserKind}
			</Badge>,
		);
	}
	if (ctx.url) {
		badges.push(
			<Badge key="url" variant="soft" tone="blue">
				{shortenUrl(ctx.url)}
			</Badge>,
		);
	}
	if (ctx.images.length > 0) {
		badges.push(
			<Badge key="shots" variant="code" tone="blue">
				{`${ctx.images.length} capture${ctx.images.length > 1 ? "s" : ""}`}
			</Badge>,
		);
	}
	if (ctx.truncated) {
		badges.push(
			<Badge key="trunc" variant="code" tone="warn">
				⚠ truncated
			</Badge>,
		);
	}
	return badges;
}

function BrowserImages({ images }: { readonly images: readonly BrowserImage[] }) {
	if (images.length === 0) return null;
	return (
		<div className="flex flex-wrap gap-2 px-3 py-2">
			{images.map((image, index) => (
				<ImageBlock
					key={`shot-${index}-${image.data.slice(0, 16)}`}
					src={`data:${image.mime};base64,${image.data}`}
					alt="browser capture"
					maxHeight={BROWSER_IMAGE_MAX_HEIGHT}
				/>
			))}
		</div>
	);
}

/** `run` → JS code cell + text output + inline captures (the eval-sibling shape). */
function renderRunBody(ctx: BrowserRenderContext): ReactNode {
	const hasContent = ctx.code || ctx.text || ctx.images.length > 0;
	if (!hasContent) return null;
	const title = (
		<>
			<span className="text-fr-text-3">tab </span>
			<span className="text-fr-text-2">{`"${ctx.tab}"`}</span>
			{ctx.url ? <span className="text-fr-text-3"> · {shortenUrl(ctx.url)}</span> : null}
		</>
	);
	return (
		<ToolBodyCard>
			<ToolBodySection
				icon="code"
				title={title}
					footer={ctx.truncated ? <BashTruncationNote {...(ctx.artifact === undefined ? {} : { artifact: ctx.artifact })} /> : null}
				maxHeight={BROWSER_BODY_MAX_HEIGHT}
				followTail={ctx.streaming}
				tailKey={ctx.text}
			>
				{ctx.code ? <PlainCodeBlock code={ctx.code} className="px-3 py-2" /> : null}
				{ctx.text ? (
					<div className="border-t border-fr-border-soft px-3 py-1.5">
						<ToolBodyTerm lines={toTermLines(ctx.text)} />
					</div>
				) : null}
			</ToolBodySection>
			<BrowserImages images={ctx.images} />
		</ToolBodyCard>
	);
}

/** `open` / `close` → the result text (the head carries the action + target). */
function renderStatusBody(ctx: BrowserRenderContext): ReactNode {
	if (!ctx.text) return null;
	return (
		<ToolBodyCard>
			<ToolBodySection padContent maxHeight={BROWSER_BODY_MAX_HEIGHT}>
				<ToolBodyTerm lines={toTermLines(ctx.text)} />
			</ToolBodySection>
		</ToolBodyCard>
	);
}

const renderBrowser: ToolRenderer = (call: ActiveToolCall): ToolView => {
	const ctx = readBrowserContext(call);
	const status: ToolStatus = ctx.streaming ? "pending" : ctx.isError ? "error" : "success";
	const stat = ctx.streaming ? "running…" : ctx.isError ? "failed" : undefined;

	return {
		label: "Browser",
		badges: buildBrowserBadges(ctx),
		kind: "web",
		status,
		stat,
		body: ctx.action === "run" ? renderRunBody(ctx) : renderStatusBody(ctx),
	};
};

export { renderBrowser };
