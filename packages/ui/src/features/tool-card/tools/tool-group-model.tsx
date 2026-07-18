import type { ReactNode } from "react";
import { useState } from "react";
import type { ActiveToolCall } from "../../../hooks/session-types";
import type { ToolCallState } from "../../../thread-state";
import { classNames } from "../../../elements/utils";
import { ToolRender } from "./tool-render";

export const DEFAULT_TOOL_GROUP_THRESHOLD = 2;
type GroupCall = ToolCallState | ActiveToolCall;
function callKey(call: GroupCall) { return "id" in call ? call.id : call.callId; }
export interface ToolGroupCardProps { readonly calls: readonly GroupCall[]; readonly renderChild?: (call: GroupCall, index: number) => ReactNode; readonly defaultOpen?: boolean; readonly className?: string }
export function ToolGroupCard({ calls, renderChild = call => <ToolRender call={call} />, defaultOpen = false, className }: ToolGroupCardProps) { const running = calls.some((call) => call.status === "running" || call.status === "pending"); const [open, setOpen] = useState(defaultOpen || running); return <section className={classNames("fraym-tool-group", className)}><button aria-expanded={open} onClick={() => setOpen(!open)} type="button">{calls.length} tool calls <span aria-hidden="true">›</span></button>{open ? <div>{calls.map((call, index) => <div key={callKey(call)}>{renderChild(call, index)}</div>)}</div> : null}</section>; }
export interface CoalesceToolGroupsOptions { readonly threshold?: number; readonly renderGroup?: (calls: readonly GroupCall[]) => ReactNode }
export function coalesceToolGroups(calls: readonly GroupCall[], renderChild: (call: GroupCall) => ReactNode, options: CoalesceToolGroupsOptions = {}): ReactNode[] { const threshold = options.threshold ?? DEFAULT_TOOL_GROUP_THRESHOLD; if (calls.length < threshold) return calls.map(renderChild); return [options.renderGroup?.(calls) ?? <ToolGroupCard calls={calls} key="tool-group" renderChild={renderChild} />]; }
