import type { ReactNode } from "react";

import { highlightCode } from "./Code";
import { CopyButton } from "./CopyButton";
import { PlainCodeBlock } from "./PlainCodeBlock";
import { classNames } from "./utils";

export const MAX_HIGHLIGHT_CHARS = 50_000;
export const MAX_FILE_HIGHLIGHT_CHARS = 250_000;
const supported = new Set(["js", "javascript", "jsx", "ts", "typescript", "tsx", "json", "css", "html", "bash", "sh", "python", "py", "go", "rust", "rs"]);
export function canSyntaxHighlight(text: string, language: string, maxChars = MAX_HIGHLIGHT_CHARS): boolean { return text.length <= maxChars && supported.has(language.toLowerCase()); }

export interface HighlightedCodeProps { code: string; language: string; lineNumbers?: boolean; startLine?: number; className?: string; codeClassName?: string }
export function HighlightedCode({ code, language, lineNumbers = false, startLine = 1, className, codeClassName }: HighlightedCodeProps) {
  if (!canSyntaxHighlight(code, language)) return <PlainCodeBlock code={code} lineNumbers={lineNumbers} startLine={startLine} {...(className ? { className } : {})} {...(codeClassName ? { codeClassName } : {})} />;
  const renderLine = (line: string, index: number): ReactNode => <span className="fraym-plain-code__line" key={index}>{lineNumbers ? <span className="fraym-plain-code__number">{startLine + index}</span> : null}<span>{highlightCode(line)}</span></span>;
  return <pre className={classNames("fraym-plain-code fraym-highlighted-code", lineNumbers && "fraym-plain-code--numbered", className)}><code className={codeClassName}>{code.split("\n").map(renderLine)}</code></pre>;
}

export interface CodeBlockProps { code: string; language?: string; lineNumbers?: boolean; className?: string }
export function CodeBlock({ code, language = "tsx", lineNumbers = false, className }: CodeBlockProps) { return <div className={classNames("fraym-code-card", className)} data-slot="code-block"><div className="fraym-code-card__copy"><CopyButton label="Copy code" value={code} /></div><HighlightedCode code={code} language={language} lineNumbers={lineNumbers} /></div>; }
