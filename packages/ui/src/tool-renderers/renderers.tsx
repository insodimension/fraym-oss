import { useMemo, useState } from "react";

import { Badge } from "../elements/Badge";
import { Button } from "../elements/Button";
import { Code } from "../elements/Code";
import type { ToolCallState } from "../thread-state";
import { arrayField, isRecord, numberField, prettyValue, stringField } from "./data";
import type { ToolRendererMap } from "./types";

function MachineField({ label, value }: { label: string; value: string }) {
  return (
    <div className="fraym-tool-field">
      <span className="fraym-tool-field__label">{label}</span>
      <Code>{value}</Code>
    </div>
  );
}

function contentFrom(call: ToolCallState): string {
  return stringField(call.output, "content", "text", "stdout")
    ?? (typeof call.output === "string" ? call.output : undefined)
    ?? stringField(call.input, "content", "text")
    ?? "No content returned.";
}

export function ReadToolRenderer({ input, output }: ToolCallState) {
  const [showMore, setShowMore] = useState(false);
  const content = stringField(output, "content", "text") ?? (typeof output === "string" ? output : "No preview returned.");
  const lines = content.split("\n");
  const lineCount = numberField(output, "lineCount", "lines") ?? lines.length;
  const preview = showMore ? content : lines.slice(0, 8).join("\n");

  return (
    <div className="fraym-tool-stack">
      <div className="fraym-tool-row">
        <MachineField label="Path" value={stringField(input, "path", "file") ?? "unknown"} />
        <Badge>{lineCount} lines</Badge>
      </div>
      <Code block language="text">{preview}</Code>
      {lines.length > 8 ? (
        <Button onClick={() => setShowMore((value) => !value)} size="sm">
          {showMore ? "Show less" : `Show ${lines.length - 8} more lines`}
        </Button>
      ) : null}
    </div>
  );
}

export function EditToolRenderer(call: ToolCallState) {
  const diff = stringField(call.output, "diff") ?? stringField(call.input, "diff", "patch") ?? contentFrom(call);

  return (
    <div className="fraym-tool-stack">
      <MachineField label="Path" value={stringField(call.input, "path", "file") ?? "unknown"} />
      <pre className="fraym-tool-diff" aria-label="Diff preview">
        {diff.split("\n").map((line, index) => {
          const kind = line.startsWith("+") && !line.startsWith("+++")
            ? "added"
            : line.startsWith("-") && !line.startsWith("---")
              ? "removed"
              : "context";
          return <span className={`fraym-tool-diff__line fraym-tool-diff__line--${kind}`} key={`${index}-${line}`}>{line || " "}</span>;
        })}
      </pre>
    </div>
  );
}

export function WriteToolRenderer(call: ToolCallState) {
  const content = contentFrom(call);
  const lines = content.split("\n");
  return (
    <div className="fraym-tool-stack">
      <div className="fraym-tool-row">
        <MachineField label="Path" value={stringField(call.input, "path", "file") ?? "unknown"} />
        <Badge>{lines.length} lines</Badge>
      </div>
      <Code block language={stringField(call.input, "language") ?? "text"}>{lines.slice(0, 12).join("\n")}</Code>
      {lines.length > 12 ? <span className="fraym-tool-note">Previewing 12 of {lines.length} lines</span> : null}
    </div>
  );
}

export function BashToolRenderer(call: ToolCallState) {
  const command = stringField(call.input, "command", "cmd") ?? "";
  const stdout = stringField(call.output, "stdout", "output") ?? (typeof call.output === "string" ? call.output : "Waiting for output…");
  const stderr = stringField(call.output, "stderr");
  const exitCode = numberField(call.output, "exitCode", "code");

  return (
    <div className="fraym-tool-stack">
      <div className="fraym-tool-command"><span aria-hidden="true">$</span><code>{command}</code></div>
      <pre className="fraym-tool-terminal">{stdout}{stderr ? `\n${stderr}` : ""}</pre>
      {exitCode !== undefined ? <Badge tone={exitCode === 0 ? "success" : "danger"}>exit {exitCode}</Badge> : null}
    </div>
  );
}

interface SearchRow {
  file: string;
  line: number | undefined;
  preview: string;
}

function searchRows(output: unknown): readonly SearchRow[] {
  return arrayField(output, "results", "matches").flatMap((item) => {
    if (!isRecord(item)) return [];
    return [{
      file: stringField(item, "file", "path") ?? "unknown",
      line: numberField(item, "line", "lineNumber"),
      preview: stringField(item, "preview", "text", "match") ?? "",
    }];
  });
}

export function SearchToolRenderer(call: ToolCallState) {
  const groups = useMemo(() => {
    const grouped = new Map<string, SearchRow[]>();
    for (const row of searchRows(call.output)) {
      grouped.set(row.file, [...(grouped.get(row.file) ?? []), row]);
    }
    return [...grouped.entries()];
  }, [call.output]);

  return (
    <div className="fraym-tool-stack">
      <MachineField label="Query" value={stringField(call.input, "query", "pattern") ?? ""} />
      <div className="fraym-tool-search-results">
        {groups.length === 0 ? <span className="fraym-tool-note">No matches.</span> : groups.map(([file, rows]) => (
          <section className="fraym-tool-search-group" key={file}>
            <Code>{file}</Code>
            {rows.map((row, index) => (
              <div className="fraym-tool-search-row" key={`${row.line ?? index}-${row.preview}`}>
                <span className="fraym-tool-search-row__line">{row.line ?? "–"}</span>
                <code>{row.preview}</code>
              </div>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}

interface TodoItem {
  text: string;
  done: boolean;
}

function todoItems(call: ToolCallState): readonly TodoItem[] {
  const source = arrayField(call.output, "items", "todos").length > 0
    ? arrayField(call.output, "items", "todos")
    : arrayField(call.input, "items", "todos");
  return source.flatMap((item) => {
    if (!isRecord(item)) return [];
    const status = stringField(item, "status");
    return [{
      text: stringField(item, "text", "title", "task") ?? "Untitled task",
      done: item.done === true || status === "done" || status === "completed",
    }];
  });
}

export function TodoToolRenderer(call: ToolCallState) {
  return (
    <ul className="fraym-tool-todo">
      {todoItems(call).map((item, index) => (
        <li className={item.done ? "fraym-tool-todo__item--done" : undefined} key={`${index}-${item.text}`}>
          <span aria-hidden="true" className="fraym-tool-todo__check">{item.done ? "✓" : "○"}</span>
          <span>{item.text}</span>
        </li>
      ))}
    </ul>
  );
}

export function TaskToolRenderer(call: ToolCallState) {
  const role = stringField(call.input, "role", "agent") ?? "subagent";
  const task = stringField(call.input, "task", "prompt") ?? "Delegated task";
  const summary = stringField(call.output, "summary", "output", "result") ?? (typeof call.output === "string" ? call.output : "Waiting for the subagent…");
  const status = stringField(call.output, "status") ?? call.status;
  return (
    <div className="fraym-tool-task">
      <div className="fraym-tool-row"><Badge tone="accent">{role}</Badge><Badge>{status}</Badge></div>
      <strong>{task}</strong>
      <p>{summary}</p>
    </div>
  );
}

export function LspToolRenderer(call: ToolCallState) {
  const result = stringField(call.output, "result", "summary", "message") ?? prettyValue(call.output);
  return (
    <div className="fraym-tool-stack">
      <div className="fraym-tool-row">
        <MachineField label="Operation" value={stringField(call.input, "operation", "method") ?? "lookup"} />
        <MachineField label="Symbol" value={stringField(call.input, "symbol", "query") ?? "unknown"} />
      </div>
      <div className="fraym-tool-result">{result}</div>
    </div>
  );
}

export function GenericToolRenderer(call: ToolCallState) {
  return (
    <div className="fraym-tool-generic">
      <section><span className="fraym-tool-field__label">Input</span><Code block language="json">{prettyValue(call.input)}</Code></section>
      <section><span className="fraym-tool-field__label">Output</span><Code block language="json">{prettyValue(call.output)}</Code></section>
    </div>
  );
}

export const builtInToolRenderers: ToolRendererMap = {
  read: (call) => <ReadToolRenderer {...call} />,
  edit: (call) => <EditToolRenderer {...call} />,
  write: (call) => <WriteToolRenderer {...call} />,
  bash: (call) => <BashToolRenderer {...call} />,
  search: (call) => <SearchToolRenderer {...call} />,
  todo: (call) => <TodoToolRenderer {...call} />,
  task: (call) => <TaskToolRenderer {...call} />,
  lsp: (call) => <LspToolRenderer {...call} />,
  "*": (call) => <GenericToolRenderer {...call} />,
};
