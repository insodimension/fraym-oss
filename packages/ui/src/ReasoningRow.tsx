import { ReasoningBlock } from "./features/message/messages/message-block-components";
import type { ThreadReasoning } from "./thread-state";
export interface ReasoningRowProps { readonly reasoning: ThreadReasoning; readonly expanded?: boolean; readonly defaultExpanded?: boolean; readonly onExpandedChange?: (expanded: boolean) => void }
export function ReasoningRow({ reasoning, expanded, defaultExpanded = false }: ReasoningRowProps) { return <ReasoningBlock defaultOpen={expanded ?? defaultExpanded} live={reasoning.streaming} text={reasoning.content} />; }
