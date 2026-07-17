import type { ReactNode } from "react";
import type { ToolCallState } from "../../../thread-state";
import { classNames } from "../../../elements/utils";
import { useState } from "react";

export const DEFAULT_TOOL_GROUP_THRESHOLD = 2;
export interface ToolGroupCardProps { readonly calls: readonly ToolCallState[]; readonly renderChild: (call: ToolCallState) => ReactNode; readonly defaultOpen?: boolean; readonly className?: string }
export function ToolGroupCard({ calls, renderChild, defaultOpen = false, className }: ToolGroupCardProps) { const running = calls.some((call) => call.status === "running" || call.status === "pending"); const [open, setOpen] = useState(defaultOpen || running); return <section className={classNames("fraym-tool-group", className)}><button aria-expanded={open} onClick={() => setOpen(!open)} type="button">{calls.length} tool calls <span aria-hidden="true">›</span></button>{open ? <div>{calls.map((call) => <div key={call.id}>{renderChild(call)}</div>)}</div> : null}</section>; }
export interface CoalesceToolGroupsOptions { readonly threshold?: number; readonly renderGroup?: (calls: readonly ToolCallState[]) => ReactNode }
export function coalesceToolGroups(calls: readonly ToolCallState[], renderChild: (call: ToolCallState) => ReactNode, options: CoalesceToolGroupsOptions = {}): ReactNode[] { const threshold = options.threshold ?? DEFAULT_TOOL_GROUP_THRESHOLD; if (calls.length < threshold) return calls.map(renderChild); return [options.renderGroup?.(calls) ?? <ToolGroupCard calls={calls} key="tool-group" renderChild={renderChild} />]; }
