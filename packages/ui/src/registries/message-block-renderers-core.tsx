import { Badge } from "../elements/badge";
import { FileMentionPill } from "../elements/file-mention";
import { MessageUsage } from "../elements/message-usage";
import { StreamingMarkdown } from "../elements/streaming-markdown";
import { ReasoningRow } from "../ReasoningRow";
import type { ActiveToolCall } from "../hooks/session-types";
import type { ToolCallState } from "../thread-state";
import { ToolCall } from "../tool-renderers/ToolCall";
import type { MessageBlock, MessageBlockRenderer, MessageBlockRendererMap } from "./message-block-registry";

function string(block: MessageBlock, key: string) { const value = block[key]; return typeof value === "string" ? value : undefined; }
function number(block: Record<string, unknown>, key: string) { const value = block[key]; return typeof value === "number" ? value : undefined; }
const renderText: MessageBlockRenderer = block => { const text = string(block, "text"); return text ? <StreamingMarkdown text={text} /> : null; };
const renderImage: MessageBlockRenderer = block => { const src = string(block, "src"); return src ? <figure className="fraym-message-image"><img alt={string(block, "alt") ?? ""} loading="lazy" src={src} />{string(block, "caption") ? <figcaption>{string(block, "caption")}</figcaption> : null}</figure> : null; };
const renderReasoning: MessageBlockRenderer = (block, context) => { const text = string(block, "text"); return text ? <ReasoningRow reasoning={{ messageId: `${context.message.id ?? "message"}-${context.index}`, content: text, streaming: Boolean(context.isStreaming && context.isLast) }} /> : null; };
const renderNotice: MessageBlockRenderer = block => { const message = string(block, "message"); const level = string(block, "level") ?? "info"; return message ? <div className={`fraym-message-notice fraym-message-notice--${level}`} role={level === "error" ? "alert" : "status"}><Badge tone={level === "error" ? "del" : level === "warning" ? "warn" : "blue"}>{level}</Badge><span>{message}</span></div> : null; };
const renderRetry: MessageBlockRenderer = block => <div className="fraym-message-retry"><Badge tone={string(block, "phase") === "failed" ? "del" : "mute"}>{string(block, "phase") ?? "retry"}</Badge><span>{string(block, "message") ?? "Trying again…"}</span></div>;
const renderFile: MessageBlockRenderer = block => { const path = string(block, "path"); return path ? <FileMentionPill path={path} fallback={path} /> : null; };
function isToolCall(value: unknown): value is ActiveToolCall { return typeof value === "object" && value !== null && typeof (value as ActiveToolCall).callId === "string" && typeof (value as ActiveToolCall).toolName === "string"; }
const renderTool: MessageBlockRenderer = block => isToolCall(block.call) ? <ToolCall call={{ id: block.call.callId, name: block.call.toolName, status: block.call.status === "success" ? "succeeded" : block.call.status === "error" ? "failed" : "running", input: block.call.input, output: block.call.output }} /> : null;
const renderUsage: MessageBlockRenderer = block => { const value = block.usage; if (!value || typeof value !== "object") return null; const usage = value as Record<string, unknown>; return <MessageUsage usage={{ input: number(usage, "input") ?? 0, output: number(usage, "output") ?? 0, cacheRead: number(usage, "cacheRead") ?? 0, cacheWrite: number(usage, "cacheWrite") ?? 0, ...(number(usage, "ttftMs") === undefined ? {} : { ttftMs: number(usage, "ttftMs")! }), ...(number(usage, "durationMs") === undefined ? {} : { durationMs: number(usage, "durationMs")! }) }} />; };
const renderCommandOutput: MessageBlockRenderer = block => { const invocation = string(block, "invocation"); const text = string(block, "text"); return invocation || text ? <div className="fraym-command-output">{invocation ? <code>{invocation}</code> : null}{text ? <pre>{text}</pre> : null}</div> : null; };
const commandChip = (kind: string): MessageBlockRenderer => block => <button className="fraym-command-chip" type="button"><Badge>{kind}</Badge>{string(block, "command") ?? `Open ${kind}`}</button>;

export const DEFAULT_MESSAGE_BLOCK_RENDERERS: MessageBlockRendererMap = Object.freeze({ text: renderText, image: renderImage, reasoning: renderReasoning, notice: renderNotice, retry: renderRetry, file: renderFile, tool: renderTool, tokenUsage: renderUsage, "command-output": renderCommandOutput, context: commandChip("context"), plan: commandChip("plan"), tasks: commandChip("tasks"), tools: commandChip("tools"), session: commandChip("session"), usage: commandChip("usage"), mcp: commandChip("mcp") });
