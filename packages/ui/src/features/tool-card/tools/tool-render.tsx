import type { ReactNode } from "react";
import type { ToolCallState } from "../../../thread-state";
import type { ActiveToolCall } from "../../../hooks/session-types";
import { ToolCall } from "../../../tool-renderers/ToolCall";
import { normalizeToolName, type ToolKind, type ToolRenderer } from "../../../registries/tool-renderer-registry";
import type { FraymDensity } from "../../surface-kit";

export function toolKindForName(name: string): ToolKind { const tool = normalizeToolName(name); if (/read|open|view/.test(tool)) return "read"; if (/search|find|grep|glob/.test(tool)) return "search"; if (/edit|write|patch/.test(tool)) return "edit"; if (/bash|shell|run|exec/.test(tool)) return "run"; if (/web|browser/.test(tool)) return "web"; if (/todo|task/.test(tool)) return "todo"; return "tool"; }
export function ToolGlyph({ name, size = 14 }: { readonly name: string; readonly size?: number }) { const glyph = toolKindForName(name) === "read" ? "⌘" : toolKindForName(name) === "search" ? "⌕" : toolKindForName(name) === "edit" ? "±" : toolKindForName(name) === "run" ? ">_" : "◇"; return <span aria-hidden="true" className="fraym-tool-glyph" style={{ fontSize: size }}>{glyph}</span>; }
function normalizeCall(call: ToolCallState | ActiveToolCall): ToolCallState { if ("id" in call) return call; return { id: call.callId, name: call.displayName ?? call.toolName, input: call.input, output: call.output, status: call.status === "success" ? "succeeded" : call.status === "error" ? "failed" : "running" }; }
export interface ToolRenderProps { readonly call: ToolCallState | ActiveToolCall; readonly renderer?: ToolRenderer; readonly defaultOpen?: boolean; readonly density?: FraymDensity; readonly className?: string }
export function ToolRender({ call, defaultOpen, className }: ToolRenderProps) { return <ToolCall call={normalizeCall(call)} {...(className ? { className } : {})} {...(defaultOpen === undefined ? {} : { defaultExpanded: defaultOpen })} />; }
export interface ConnectedToolStreamProps { readonly calls?: readonly ToolCallState[]; readonly className?: string; readonly emptyState?: ReactNode }
export function ConnectedToolStream({ calls = [], className, emptyState = null }: ConnectedToolStreamProps) { return <div className={className}>{calls.length ? calls.map((call) => <ToolRender call={call} key={call.id} />) : emptyState}</div>; }
