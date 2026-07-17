import { Fragment, type ReactNode } from "react";
import { classNames } from "../../../elements/utils";
import { DEFAULT_MESSAGE_BLOCK_RENDERERS } from "../../../registries/default-renderers";
import { type MessageBlockContext, type MessageBlockRendererMap, useMessageBlockRenderers } from "../../../registries/message-block-registry";
import type { MessageBlock, MessageData } from "../message";

const traceTypes = new Set(["reasoning", "tool"]);
export type BodyEntry = { readonly block: MessageBlock; readonly index: number };
export type BodyItem = { readonly kind: "prose"; readonly block: MessageBlock; readonly index: number } | { readonly kind: "trace"; readonly entries: readonly BodyEntry[] };
export function partitionBlocks(blocks: readonly MessageBlock[]): BodyItem[] { const items: BodyItem[] = []; let run: BodyEntry[] = []; const flush = () => { if (run.length) items.push({ kind: "trace", entries: run }); run = []; }; blocks.forEach((block, index) => { if (traceTypes.has(block.type) || (block.type === "tokenUsage" && run.length)) run.push({ block, index }); else { flush(); items.push({ kind: "prose", block, index }); } }); flush(); return items; }
export type ResolvedBlockRenderer = (block: MessageBlock, index: number) => ReactNode;
export type Coalesce = (blocks: readonly MessageBlock[], renderBlock: ResolvedBlockRenderer) => ReactNode[];
export function useResolvedBlockRenderer(message: MessageData, isLast?: boolean, isStreaming?: boolean, components?: MessageBlockRendererMap, legacy?: (block: MessageBlock, index: number) => ReactNode): ResolvedBlockRenderer { const registry = useMessageBlockRenderers(); return (block, index) => { const context: MessageBlockContext = { index, message, isLast, isStreaming }; return components?.[block.type]?.(block, context) ?? registry[block.type]?.(block, context) ?? legacy?.(block, index) ?? DEFAULT_MESSAGE_BLOCK_RENDERERS[block.type]?.(block, context) ?? null; }; }
export interface MessageBodyProps { readonly message: MessageData; readonly isLast?: boolean | undefined; readonly isStreaming?: boolean | undefined; readonly components?: MessageBlockRendererMap | undefined; readonly className?: string }
export function MessageBody({ message, isLast, isStreaming, components, className }: MessageBodyProps) { const render = useResolvedBlockRenderer(message, isLast, isStreaming, components); return <div className={classNames("fraym-message-body", className)}>{partitionBlocks(message.blocks).map((item, itemIndex) => item.kind === "prose" ? <Fragment key={`p-${item.index}`}>{render(item.block, item.index)}</Fragment> : <div className="fraym-trace-group" data-slot="trace-group" key={`t-${itemIndex}`}>{item.entries.map(({ block, index }) => <Fragment key={index}>{render(block, index)}</Fragment>)}</div>)}</div>; }
