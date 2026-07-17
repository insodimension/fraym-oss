import { Fragment, type ReactNode } from "react";

import { Code } from "./Code";
import { classNames } from "./utils";

export interface StreamingMarkdownProps {
  children: string;
  className?: string;
}

export type MarkdownBlock =
  | { kind: "text"; content: string }
  | { kind: "code"; code: string; language?: string; complete: boolean };

/** Splits completed and in-progress fenced code blocks without dropping partial input. */
export function parseStreamingMarkdown(markdown: string): MarkdownBlock[] {
  const content = markdown.replaceAll("\r\n", "\n");
  const blocks: MarkdownBlock[] = [];
  let cursor = 0;

  while (cursor < content.length) {
    const openingFence = content.indexOf("```", cursor);
    if (openingFence === -1) {
      const text = content.slice(cursor);
      if (text) {
        blocks.push({ kind: "text", content: text });
      }
      break;
    }

    const text = content.slice(cursor, openingFence);
    if (text) {
      blocks.push({ kind: "text", content: text });
    }

    const codeStart = openingFence + 3;
    const closingFence = content.indexOf("```", codeStart);
    const rawCode = content.slice(codeStart, closingFence === -1 ? undefined : closingFence);
    const firstNewline = rawCode.indexOf("\n");
    const language = firstNewline === -1 ? undefined : rawCode.slice(0, firstNewline).trim() || undefined;
    const code = firstNewline === -1 ? rawCode : rawCode.slice(firstNewline + 1);

    blocks.push({
      kind: "code",
      code,
      ...(language ? { language } : {}),
      complete: closingFence !== -1,
    });

    if (closingFence === -1) {
      break;
    }

    cursor = closingFence + 3;
  }

  return blocks;
}

function renderInline(text: string): ReactNode[] {
  return text.split(/(`[^`]*`|\*\*[^*]+\*\*)/g).map((part, index) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return <Code key={index}>{part.slice(1, -1)}</Code>;
    }

    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }

    return <Fragment key={index}>{part}</Fragment>;
  });
}

function TextMarkdown({ content }: { content: string }) {
  return (
    <>
      {content
        .trim()
        .split(/\n\s*\n/)
        .filter(Boolean)
        .map((paragraph, index) => {
          if (paragraph.startsWith("# ")) {
            return <h3 key={index}>{renderInline(paragraph.slice(2))}</h3>;
          }

          const lines = paragraph.split("\n");
          if (lines.every((line) => line.startsWith("- "))) {
            return (
              <ul key={index}>
                {lines.map((line, lineIndex) => (
                  <li key={lineIndex}>{renderInline(line.slice(2))}</li>
                ))}
              </ul>
            );
          }

          return (
            <p key={index}>
              {lines.map((line, lineIndex) => (
                <Fragment key={lineIndex}>
                  {lineIndex > 0 ? <br /> : null}
                  {renderInline(line)}
                </Fragment>
              ))}
            </p>
          );
        })}
    </>
  );
}

export function StreamingMarkdown({ children, className }: StreamingMarkdownProps) {
  return (
    <div className={classNames("fraym-markdown", className)}>
      {parseStreamingMarkdown(children).map((block, index) =>
        block.kind === "code" ? (
          <Code
            block
            className="fraym-markdown__code"
            key={index}
            {...(block.language ? { language: block.language } : {})}
          >
            {block.code}
          </Code>
        ) : (
          <TextMarkdown content={block.content} key={index} />
        ),
      )}
    </div>
  );
}
