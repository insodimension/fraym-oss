import { Fragment, memo, type ReactNode, useMemo } from "react";

import { CodeBlock } from "./CodeBlock";
import { FileMentionPill, looksLikeFilePath, renderTextWithMentions } from "./FileMention";
import { classNames } from "./utils";

export interface StaticMarkdownLiteProps { text: string; className?: string }

export function parseSessionHref(value: string): { workspaceId: string; sessionId: string } | null {
  const match = /^session:\/\/([^/\s]+)\/(\S+)$/i.exec(value.trim());
  return match?.[1] && match[2] ? { workspaceId: match[1], sessionId: match[2] } : null;
}

const inlinePattern = /(`[^`]+`|!\[[^\]]*\]\([^)\s]+\)|\[[^\]]+\]\([^)\s]+\)|\*\*[^*]+\*\*|~~[^~]+~~|\*[^*]+\*|https?:\/\/[^\s<>{}"'`]+)/g;

function plainText(text: string, key: string): ReactNode[] { return renderTextWithMentions(text, key); }

function inline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let cursor = 0;
  for (const match of text.matchAll(inlinePattern)) {
    const start = match.index ?? 0;
    if (start > cursor) nodes.push(...plainText(text.slice(cursor, start), `${keyPrefix}-t${start}`));
    const token = match[0];
    if (token.startsWith("`")) {
      const value = token.slice(1, -1);
      nodes.push(looksLikeFilePath(value) ? <FileMentionPill fallback={<code>{value}</code>} key={`${keyPrefix}-${start}`} path={value} /> : <code key={`${keyPrefix}-${start}`}>{value}</code>);
    } else if (token.startsWith("![")) {
      const image = /^!\[([^\]]*)\]\(([^)]+)\)$/.exec(token);
      const source = image?.[2];
      nodes.push(source && /^(https?:\/\/|\/|data:image\/)/i.test(source) ? <img alt={image?.[1] ?? ""} key={`${keyPrefix}-${start}`} loading="lazy" src={source} /> : token);
    } else if (token.startsWith("[")) {
      const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
      const href = link?.[2] ?? "";
      const safe = /^(https?:|mailto:|#|\/)/i.test(href);
      nodes.push(safe ? <a href={href} key={`${keyPrefix}-${start}`} rel="noopener noreferrer" target={/^https?:/i.test(href) ? "_blank" : undefined}>{link?.[1]}</a> : <span key={`${keyPrefix}-${start}`}>{link?.[1]}</span>);
    } else if (token.startsWith("**")) nodes.push(<strong key={`${keyPrefix}-${start}`}>{inline(token.slice(2, -2), `${keyPrefix}-b${start}`)}</strong>);
    else if (token.startsWith("~~")) nodes.push(<del key={`${keyPrefix}-${start}`}>{inline(token.slice(2, -2), `${keyPrefix}-d${start}`)}</del>);
    else if (token.startsWith("*")) nodes.push(<em key={`${keyPrefix}-${start}`}>{inline(token.slice(1, -1), `${keyPrefix}-e${start}`)}</em>);
    else nodes.push(<a href={token.replace(/[.,;:!?]+$/, "")} key={`${keyPrefix}-${start}`} rel="noopener noreferrer" target="_blank">{token}</a>);
    cursor = start + token.length;
  }
  if (cursor < text.length) nodes.push(...plainText(text.slice(cursor), `${keyPrefix}-end`));
  return nodes;
}

function splitCells(line: string): string[] { return line.trim().replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim()); }

function renderBlocks(text: string): ReactNode[] {
  const lines = text.replaceAll("\r\n", "\n").split("\n");
  const output: ReactNode[] = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index] ?? "";
    if (!line.trim()) { index += 1; continue; }
    const fence = /^\s{0,3}(```|~~~)\s*([^\s`]*)/.exec(line);
    if (fence) { const marker = fence[1] ?? "```"; const language = fence[2] || "text"; const body: string[] = []; index += 1; while (index < lines.length && !(lines[index] ?? "").trimStart().startsWith(marker)) { body.push(lines[index] ?? ""); index += 1; } if (index < lines.length) index += 1; output.push(<CodeBlock code={body.join("\n")} key={`code-${index}`} language={language} />); continue; }
    const heading = /^\s{0,3}(#{1,6})\s+(.+)$/.exec(line);
    if (heading) { const level = heading[1]?.length ?? 1; const content = inline(heading[2] ?? "", `h${index}`); output.push(level === 1 ? <h1 key={index}>{content}</h1> : level === 2 ? <h2 key={index}>{content}</h2> : level === 3 ? <h3 key={index}>{content}</h3> : <h4 key={index}>{content}</h4>); index += 1; continue; }
    if (/^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/.test(line)) { output.push(<hr key={index} />); index += 1; continue; }
    if (/^\s{0,3}>/.test(line)) { const quote: string[] = []; while (index < lines.length && /^\s{0,3}>/.test(lines[index] ?? "")) { quote.push((lines[index] ?? "").replace(/^\s{0,3}>\s?/, "")); index += 1; } output.push(<blockquote key={`q-${index}`}>{renderBlocks(quote.join("\n"))}</blockquote>); continue; }
    const listMatch = /^\s*([-*+]|\d+\.)\s+(.+)$/.exec(line);
    if (listMatch) { const ordered = /\d+\./.test(listMatch[1] ?? ""); const items: string[] = []; while (index < lines.length) { const item = /^\s*([-*+]|\d+\.)\s+(.+)$/.exec(lines[index] ?? ""); if (!item || /\d+\./.test(item[1] ?? "") !== ordered) break; items.push(item[2] ?? ""); index += 1; } const children = items.map((item, itemIndex) => { const task = /^\[([ xX])\]\s+(.+)$/.exec(item); return <li key={itemIndex}>{task ? <><input checked={task[1]?.toLowerCase() === "x"} readOnly type="checkbox" /> {inline(task[2] ?? "", `li-${index}-${itemIndex}`)}</> : inline(item, `li-${index}-${itemIndex}`)}</li>; }); output.push(ordered ? <ol key={`l-${index}`}>{children}</ol> : <ul key={`l-${index}`}>{children}</ul>); continue; }
    const next = lines[index + 1] ?? "";
    if (line.includes("|") && /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?\s*$/.test(next)) { const headers = splitCells(line); const rows: string[][] = []; index += 2; while (index < lines.length && (lines[index] ?? "").includes("|")) { rows.push(splitCells(lines[index] ?? "")); index += 1; } output.push(<table key={`t-${index}`}><thead><tr>{headers.map((cell, cellIndex) => <th key={cellIndex}>{inline(cell, `th-${cellIndex}`)}</th>)}</tr></thead><tbody>{rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex}>{inline(cell, `td-${rowIndex}-${cellIndex}`)}</td>)}</tr>)}</tbody></table>); continue; }
    const paragraph = [line]; index += 1; while (index < lines.length && (lines[index] ?? "").trim() && !/^(\s{0,3}(#{1,6})\s|\s{0,3}>|\s*([-*+]|\d+\.)\s|\s{0,3}(```|~~~))/.test(lines[index] ?? "")) { paragraph.push(lines[index] ?? ""); index += 1; } output.push(<p key={`p-${index}`}>{paragraph.map((part, partIndex) => <Fragment key={partIndex}>{partIndex ? <br /> : null}{inline(part, `p-${index}-${partIndex}`)}</Fragment>)}</p>);
  }
  return output;
}

export const StaticMarkdownLite = memo(function StaticMarkdownLite({ text, className }: StaticMarkdownLiteProps) { const content = useMemo(() => renderBlocks(text), [text]); return <div className={classNames("fraym-static-markdown", className)} data-slot="static-markdown-lite">{content}</div>; });
