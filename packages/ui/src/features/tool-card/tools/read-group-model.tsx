import type { ReactNode } from "react";
import type { ToolCallState } from "../../../thread-state";
import { normalizeToolName } from "../../../registries/tool-renderer-registry";

export function coalesceReadGroups(calls: readonly ToolCallState[], renderChild: (call: ToolCallState) => ReactNode): ReactNode[] { const output: ReactNode[] = []; let reads: ToolCallState[] = []; const flush = () => { if (!reads.length) return; output.push(<div className="fraym-read-group" key={`reads-${reads[0]?.id}`}>{reads.map((call) => <div key={call.id}>{renderChild(call)}</div>)}</div>); reads = []; }; for (const call of calls) { if (["read", "open", "view", "cat"].includes(normalizeToolName(call.name))) reads.push(call); else { flush(); output.push(renderChild(call)); } } flush(); return output; }
