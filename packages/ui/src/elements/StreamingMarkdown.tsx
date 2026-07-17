import { memo } from "react";

import "./streaming-markdown.css";
import { StaticMarkdownLite } from "./StaticMarkdownLite";
import { classNames } from "./utils";

export type MarkdownBlock = { kind: "text"; content: string } | { kind: "code"; code: string; language?: string; complete: boolean };

export function parseStreamingMarkdown(markdown: string): MarkdownBlock[] {
  const content = markdown.replaceAll("\r\n", "\n");
  const blocks: MarkdownBlock[] = [];
  let cursor = 0;
  while (cursor < content.length) {
    const opening = content.indexOf("```", cursor);
    if (opening < 0) { const text = content.slice(cursor); if (text) blocks.push({ kind: "text", content: text }); break; }
    const text = content.slice(cursor, opening);
    if (text) blocks.push({ kind: "text", content: text });
    const start = opening + 3;
    const closing = content.indexOf("```", start);
    const raw = content.slice(start, closing < 0 ? undefined : closing);
    const newline = raw.indexOf("\n");
    const language = newline < 0 ? undefined : raw.slice(0, newline).trim() || undefined;
    const block = { kind: "code" as const, code: newline < 0 ? raw : raw.slice(newline + 1), complete: closing >= 0, ...(language ? { language } : {}) };
    blocks.push(block);
    if (closing < 0) break;
    cursor = closing + 3;
  }
  return blocks;
}

export interface StreamingMarkdownProps {
  text?: string;
  children?: string;
  animate?: boolean;
  streaming?: boolean;
  lineNumbers?: boolean;
  className?: string;
}

export const StreamingMarkdown = memo(function StreamingMarkdown({ text, children, animate = false, streaming = false, lineNumbers = false, className }: StreamingMarkdownProps) {
  const source = text ?? children ?? "";
  return <div aria-live={streaming ? "polite" : undefined} className={classNames("fraym-markdown", "fraym-streaming-markdown", animate && "is-animating", lineNumbers && "fraym-code-lines", className)} data-slot="streaming-markdown"><StaticMarkdownLite text={source} /></div>;
});
