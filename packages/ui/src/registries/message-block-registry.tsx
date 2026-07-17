import { createContext, type ReactNode, useContext, useMemo } from "react";

export type KnownMessageBlockType = "text" | "tool" | "diff" | "actions" | "surface" | "reasoning" | "notice" | "retry" | "image" | "file" | "tokenUsage";
export interface MessageBlock { readonly type: KnownMessageBlockType | (string & {}); readonly [key: string]: unknown }
export interface MessageData { readonly role: "user" | "agent" | "assistant" | "divider"; readonly blocks: readonly MessageBlock[]; readonly id?: string; readonly timestamp?: string; readonly name?: string; readonly meta?: string; readonly customType?: string; readonly payload?: unknown }
export interface MessageBlockContext { readonly index: number; readonly message: MessageData; readonly isLast?: boolean; readonly isStreaming?: boolean }
export type MessageBlockRenderer = (block: MessageBlock, context: MessageBlockContext) => ReactNode;
export type MessageBlockRendererMap = Readonly<Record<string, MessageBlockRenderer>>;
const empty: MessageBlockRendererMap = Object.freeze({});
const MessageBlockContextValue = createContext<MessageBlockRendererMap | null>(null);
export interface MessageBlockProviderProps { readonly renderers: MessageBlockRendererMap; readonly replace?: boolean; readonly children: ReactNode }
export function MessageBlockProvider({ renderers, replace = false, children }: MessageBlockProviderProps) { const parent = useContext(MessageBlockContextValue); const value = useMemo<MessageBlockRendererMap>(() => replace || !parent ? renderers : { ...parent, ...renderers }, [parent, renderers, replace]); return <MessageBlockContextValue.Provider value={value}>{children}</MessageBlockContextValue.Provider>; }
export function useMessageBlockRenderers() { return useContext(MessageBlockContextValue) ?? empty; }
export function useMessageBlockRenderer(type: string) { return useMessageBlockRenderers()[type]; }

export const DEFAULT_GROUPABLE_BLOCK_TYPES: ReadonlySet<string> = new Set(["tool", "reasoning"]);
export interface GroupedBlockEntry { readonly block: MessageBlock; readonly index: number }
export interface GroupedSingleBlock { readonly kind: "single"; readonly block: MessageBlock; readonly index: number }
export interface GroupedBlockRun { readonly kind: "group"; readonly items: readonly GroupedBlockEntry[] }
export type GroupedBlock = GroupedSingleBlock | GroupedBlockRun;
export function groupBlocks(blocks: readonly MessageBlock[], groupable: ReadonlySet<string> = DEFAULT_GROUPABLE_BLOCK_TYPES): readonly GroupedBlock[] {
  const output: GroupedBlock[] = []; let run: GroupedBlockEntry[] = [];
  const flush = () => { if (run.length === 1 && run[0]) output.push({ kind: "single", block: run[0].block, index: run[0].index }); else if (run.length > 1) output.push({ kind: "group", items: run }); run = []; };
  blocks.forEach((block, index) => { if (groupable.has(block.type)) run.push({ block, index }); else { flush(); output.push({ kind: "single", block, index }); } }); flush(); return output;
}
