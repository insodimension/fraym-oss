import type { ReactNode } from "react";

import { classNames } from "./utils";

export interface CodeProps {
  children: string;
  className?: string;
  language?: string;
  block?: boolean;
}

type SyntaxToken = "comment" | "string" | "keyword" | "number";

const syntaxPattern =
  /(\/\/.*$|\/\*[\s\S]*?\*\/)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|\b(const|let|var|function|return|if|else|async|await|import|from|export|type|interface|class|new|true|false|null|undefined)\b|\b\d+(?:\.\d+)?\b/gm;

function syntaxTokenFor(match: string): SyntaxToken {
  if (match.startsWith("//") || match.startsWith("/*")) {
    return "comment";
  }

  if (["\"", "'", "`"].includes(match[0] ?? "")) {
    return "string";
  }

  if (/^\d/.test(match)) {
    return "number";
  }

  return "keyword";
}

export function highlightCode(code: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let cursor = 0;

  for (const match of code.matchAll(syntaxPattern)) {
    const index = match.index ?? cursor;
    if (index > cursor) {
      nodes.push(code.slice(cursor, index));
    }

    const value = match[0];
    nodes.push(
      <span className={`fraym-code__token--${syntaxTokenFor(value)}`} key={index}>
        {value}
      </span>,
    );
    cursor = index + value.length;
  }

  if (cursor < code.length) {
    nodes.push(code.slice(cursor));
  }

  return nodes;
}

export function Code({
  block = false,
  children,
  className,
  language,
}: CodeProps) {
  if (!block) {
    return <code className={classNames("fraym-code", className)}>{children}</code>;
  }

  return (
    <pre
      aria-label={language ? `${language} code` : "Code"}
      className={classNames("fraym-code-block", className)}
    >
      {language ? <span className="fraym-code-block__language">{language}</span> : null}
      <code>{highlightCode(children)}</code>
    </pre>
  );
}
