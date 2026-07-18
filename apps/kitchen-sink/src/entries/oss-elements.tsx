import { useEffect, useState } from "react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  Code,
  IconButton,
  Kbd,
  MessageActions,
  MessageUsage,
  ScrollArea,
  Separator,
  Shimmer,
  Skeleton,
  Spinner,
  StreamingMarkdown,
  Textarea,
  ThinkingDots,
  Tooltip,
  type ButtonSize,
  type ButtonVariant,
  type BadgeTone,
} from "@fraym/ui";

import {
  booleanValue,
  numberValue,
  stringValue,
  type DemoProps,
  type Entry,
} from "../entry";
import { additionalElementEntries } from "./element-additions";
import { decorativeElementEntries } from "./decorative-elements";
import { rendererContractEntries } from "./renderer-contract";

function ButtonDemo({ values }: DemoProps) {
  const [runs, setRuns] = useState(0);
  const variant = stringValue(values, "variant", "primary") as ButtonVariant;
  const size = stringValue(values, "size", "md") as ButtonSize;
  const label = stringValue(values, "label", "Run agent");
  const disabled = booleanValue(values, "disabled");

  return (
    <div className="sink-demo-stack">
      <div className="sink-demo-row">
        <Button disabled={disabled} size={size} variant={variant} onClick={() => setRuns((value) => value + 1)}>
          {label}
        </Button>
      </div>
      <span className="sink-demo-feedback" role="status">Runs started: {runs}</span>
    </div>
  );
}

function IconButtonDemo({ values }: DemoProps) {
  const [pinned, setPinned] = useState(false);
  const variant = stringValue(values, "variant", "secondary") as ButtonVariant;
  const size = stringValue(values, "size", "md") as ButtonSize;
  const disabled = booleanValue(values, "disabled");

  return (
    <div className="sink-demo-row">
      <IconButton
        aria-pressed={pinned}
        label={pinned ? "Unpin message" : "Pin message"}
        disabled={disabled}
        size={size}
        variant={pinned ? "primary" : variant}
        onClick={() => setPinned((value) => !value)}
      >
        P
      </IconButton>
      <span className="sink-demo-feedback" role="status">
        Message {pinned ? "pinned" : "not pinned"}
      </span>
    </div>
  );
}

function BadgeDemo({ values }: DemoProps) {
  const tone = stringValue(values, "tone", "neutral") as BadgeTone;
  const label = stringValue(values, "label", "Tool complete");

  return (
    <div className="sink-demo-row">
      <Badge tone={tone}>{label}</Badge>
    </div>
  );
}

function CardDemo({ values }: DemoProps) {
  const [approved, setApproved] = useState(false);
  const title = stringValue(values, "title", "Workspace change");
  const showFooter = booleanValue(values, "showFooter", true);

  return (
    <Card className="sink-demo-card">
      <CardHeader>
        <strong>{title}</strong>
      </CardHeader>
      <CardContent>
        <p>The agent wants to update two TypeScript files.</p>
      </CardContent>
      {showFooter ? <CardFooter className="sink-demo-row">
        <Button size="sm" variant="primary" onClick={() => setApproved(true)}>Approve</Button>
        <Badge tone={approved ? "success" : "warning"}>
          {approved ? "Approved" : "Waiting"}
        </Badge>
      </CardFooter> : null}
    </Card>
  );
}

const codeSample = `export function greet(name: string) {
  return \`Hello, \${name}\`;
}`;

function CodeDemo({ values }: DemoProps) {
  const [copied, setCopied] = useState(false);
  const block = booleanValue(values, "block", true);
  const language = stringValue(values, "language", "ts");

  const copy = async () => {
    await navigator.clipboard.writeText(codeSample);
    setCopied(true);
  };

  return (
    <div className="sink-demo-stack">
      {block ? <Code block language={language}>{codeSample}</Code> : <p>Use <Code>createReplayDriver()</Code> for deterministic demos.</p>}
      <Button size="sm" variant="secondary" onClick={copy}>
        {copied ? "Copied" : "Copy code"}
      </Button>
    </div>
  );
}

const markdownSample = `# Stream-safe Markdown

Partial fences stay stable while tokens arrive.

\`\`\`ts
const ready = true;
\`\`\``;

function StreamingMarkdownDemo({ values }: DemoProps) {
  const [content, setContent] = useState(markdownSample);
  const [streaming, setStreaming] = useState(false);
  const chunkSize = numberValue(values, "chunkSize", 3);

  useEffect(() => {
    if (!streaming) {
      return;
    }

    if (content.length >= markdownSample.length) {
      setStreaming(false);
      return;
    }

    const timer = setTimeout(() => {
      setContent(markdownSample.slice(0, content.length + chunkSize));
    }, 35);

    return () => clearTimeout(timer);
  }, [chunkSize, content, streaming]);

  return (
    <div className="sink-demo-stack">
      <StreamingMarkdown>{content}</StreamingMarkdown>
      <Button
        size="sm"
        variant="secondary"
        onClick={() => {
          setContent("");
          setStreaming(true);
        }}
      >
        Stream again
      </Button>
    </div>
  );
}

function SpinnerDemo({ values }: DemoProps) {
  const visible = booleanValue(values, "visible", true);
  const label = stringValue(values, "label", "Running tool");

  return (
    <div className="sink-demo-row">
      {visible ? <Spinner label={label} /> : <Badge tone="success">Complete</Badge>}
    </div>
  );
}

function ThinkingDotsDemo({ values }: DemoProps) {
  const visible = booleanValue(values, "visible", true);

  return (
    <div className="sink-demo-row">
      {visible ? <ThinkingDots /> : <span className="sink-demo-feedback">Ready to answer</span>}
    </div>
  );
}

function SkeletonDemo({ values }: DemoProps) {
  const loaded = booleanValue(values, "loaded");

  return (
    <div className="sink-demo-stack">
      {loaded ? (
        <div className="sink-loaded-message">
          <strong>Assistant</strong>
          <p>The repository is ready.</p>
        </div>
      ) : (
        <div className="sink-skeleton-stack">
          <Skeleton className="sink-skeleton-line sink-skeleton-line--short" />
          <Skeleton className="sink-skeleton-line" />
          <Skeleton className="sink-skeleton-line sink-skeleton-line--medium" />
        </div>
      )}
    </div>
  );
}

function ShimmerDemo({ values }: DemoProps) {
  const active = booleanValue(values, "active", true);

  return (
    <div className="sink-demo-stack">
      {active ? <Shimmer className="sink-shimmer-block" /> : <div className="sink-loaded-panel">Generated summary ready.</div>}
    </div>
  );
}

function SeparatorDemo({ values }: DemoProps) {
  const vertical = stringValue(values, "orientation", "horizontal") === "vertical";

  return (
    <div className="sink-demo-stack">
      <div className={vertical ? "sink-separator-demo sink-separator-demo--vertical" : "sink-separator-demo"}>
        <span>Context</span>
        <Separator orientation={vertical ? "vertical" : "horizontal"} />
        <span>Response</span>
      </div>
    </div>
  );
}

function ScrollAreaDemo({ values }: DemoProps) {
  const count = numberValue(values, "items", 6);
  const events = Array.from({ length: count }, (_, index) => `Agent event ${index + 1}`);

  return (
    <div className="sink-demo-stack">
      <ScrollArea className="sink-scroll-demo">
        {events.map((event, index) => (
          <div className="sink-event-row" key={`${event}-${index}`}>{event}</div>
        ))}
      </ScrollArea>
    </div>
  );
}

function TooltipDemo({ values }: DemoProps) {
  const content = stringValue(values, "content", "Replay the recorded session");
  return (
    <div className="sink-demo-row">
      <Tooltip content={content}>
        <Button variant="secondary">Hover or focus</Button>
      </Tooltip>
      <span className="sink-demo-feedback">Keyboard accessible</span>
    </div>
  );
}

function KbdDemo({ values }: DemoProps) {
  const [lastKey, setLastKey] = useState("none");
  const shortcut = stringValue(values, "shortcut", "Ctrl K").split(" ");

  return (
    <div
      className="sink-shortcut-demo"
      tabIndex={0}
      onKeyDown={(event) => setLastKey(event.key)}
    >
      <p>Focus this panel, then press a key.</p>
      <div className="sink-demo-row">
        {shortcut.map((key, index) => <span className="sink-key-part" key={`${key}-${index}`}><Kbd>{key}</Kbd>{index < shortcut.length - 1 ? <span>+</span> : null}</span>)}
        <span className="sink-demo-feedback" role="status">Last key: {lastKey}</span>
      </div>
    </div>
  );
}

function TextareaDemo({ values }: DemoProps) {
  const [prompt, setPrompt] = useState("");
  const placeholder = stringValue(values, "placeholder", "Ask the agent to inspect a file");
  const disabled = booleanValue(values, "disabled");

  return (
    <div className="sink-demo-stack">
      <label className="sink-field-label" htmlFor="composer-demo">Message</label>
      <Textarea
        id="composer-demo"
        disabled={disabled}
        placeholder={placeholder}
        value={prompt}
        onChange={(event) => setPrompt(event.currentTarget.value)}
      />
      <span className="sink-demo-feedback" role="status">{prompt.length} characters</span>
    </div>
  );
}

function MessageActionsDemo({ values }: DemoProps) {
  const [status, setStatus] = useState("Choose an action");
  const disabled = booleanValue(values, "disabled");

  return (
    <div className="sink-demo-stack">
      <MessageActions
        actions={[
          { id: "copy", label: "Copy message", icon: "C", disabled, onClick: () => setStatus("Copied message") },
          { id: "retry", label: "Retry response", icon: "R", disabled, onClick: () => setStatus("Retry requested") },
          { id: "useful", label: "Mark useful", icon: "+", onClick: () => setStatus("Marked useful") },
        ]}
      />
      <span className="sink-demo-feedback" role="status">{status}</span>
    </div>
  );
}

function MessageUsageDemo({ values }: DemoProps) {
  const inputTokens = numberValue(values, "inputTokens", 1240);
  const outputTokens = numberValue(values, "outputTokens", 268);

  return (
    <div className="sink-demo-row">
      <MessageUsage inputTokens={inputTokens} outputTokens={outputTokens} />
    </div>
  );
}

const baseElementEntries = [
  {
    id: "button",
    title: "Button",
    group: "elements",
    description: "Action hierarchy with primary, secondary, ghost, danger, size, and disabled states.",
    Demo: ButtonDemo,
    code: `<Button variant="primary" onClick={runAgent}>Run agent</Button>
<Button variant="secondary">Reset</Button>
<Button variant="danger">Stop</Button>`,
  },
  {
    id: "icon-button",
    title: "IconButton",
    group: "elements",
    description: "Compact labeled controls for message and toolbar actions.",
    Demo: IconButtonDemo,
    code: `<IconButton label="Pin message" onClick={togglePin}>
  <PinIcon />
</IconButton>`,
  },
  {
    id: "badge",
    title: "Badge",
    group: "elements",
    description: "Low-noise semantic status for tools, sessions, and metadata.",
    Demo: BadgeDemo,
    code: `<Badge tone="success">Complete</Badge>
<Badge tone="warning">Waiting</Badge>`,
  },
  {
    id: "card",
    title: "Card",
    group: "elements",
    description: "Structured containment with optional header, content, and footer regions.",
    Demo: CardDemo,
    code: `<Card>
  <CardHeader>Workspace change</CardHeader>
  <CardContent>Two files will change.</CardContent>
  <CardFooter><Button variant="primary">Approve</Button></CardFooter>
</Card>`,
  },
  {
    id: "code",
    title: "Code",
    group: "elements",
    description: "Inline and block code with lightweight syntax highlighting.",
    Demo: CodeDemo,
    code: `<p>Call <Code>run()</Code> when ready.</p>
<Code block language="ts">{source}</Code>`,
  },
  {
    id: "streaming-markdown",
    title: "StreamingMarkdown",
    group: "elements",
    description: "Incremental Markdown rendering that keeps unfinished fenced code stable.",
    Demo: StreamingMarkdownDemo,
    code: `<StreamingMarkdown>
  {accumulatedAssistantText}
</StreamingMarkdown>`,
  },
  {
    id: "spinner",
    title: "Spinner",
    group: "elements",
    description: "Compact indeterminate progress for inline, short-lived operations.",
    Demo: SpinnerDemo,
    code: `{loading ? <Spinner label="Running tool" /> : <Badge tone="success">Complete</Badge>}`,
  },
  {
    id: "thinking-dots",
    title: "ThinkingDots",
    group: "elements",
    description: "A restrained waiting indicator for assistant response latency.",
    Demo: ThinkingDotsDemo,
    code: `{waitingForAssistant ? <ThinkingDots /> : null}`,
  },
  {
    id: "skeleton",
    title: "Skeleton",
    group: "elements",
    description: "Shape-matched loading placeholders for content that has not resolved.",
    Demo: SkeletonDemo,
    code: `<div className="message-skeleton">
  <Skeleton />
  <Skeleton />
</div>`,
  },
  {
    id: "shimmer",
    title: "Shimmer",
    group: "elements",
    description: "Animated placeholder material for a single loading region.",
    Demo: ShimmerDemo,
    code: `{generating ? <Shimmer className="summary-placeholder" /> : <Summary />}`,
  },
  {
    id: "separator",
    title: "Separator",
    group: "elements",
    description: "Semantic horizontal or vertical division between related regions.",
    Demo: SeparatorDemo,
    code: `<Separator />
<Separator orientation="vertical" />`,
  },
  {
    id: "scroll-area",
    title: "ScrollArea",
    group: "elements",
    description: "Overflow containment for threads, logs, and bounded panels.",
    Demo: ScrollAreaDemo,
    code: `<ScrollArea className="event-log">
  {events.map((event) => <EventRow event={event} />)}
</ScrollArea>`,
  },
  {
    id: "tooltip",
    title: "Tooltip",
    group: "elements",
    description: "Hover and focus context for compact controls.",
    Demo: TooltipDemo,
    code: `<Tooltip content="Replay the recorded session">
  <Button variant="secondary">Replay</Button>
</Tooltip>`,
  },
  {
    id: "kbd",
    title: "Kbd",
    group: "elements",
    description: "Keyboard chords and single-key hints with familiar keycap styling.",
    Demo: KbdDemo,
    code: `<span>Open composer <Kbd>Ctrl</Kbd> + <Kbd>K</Kbd></span>`,
  },
  {
    id: "textarea",
    title: "Textarea",
    group: "elements",
    description: "Strictly typed multiline input for prompts and follow-up instructions.",
    Demo: TextareaDemo,
    code: `<label htmlFor="message">Message</label>
<Textarea id="message" value={message} onChange={onChange} />`,
  },
  {
    id: "message-actions",
    title: "MessageActions",
    group: "elements",
    description: "Composable action cluster for copy, retry, feedback, and custom message controls.",
    Demo: MessageActionsDemo,
    code: `<MessageActions actions={[
  { id: "copy", label: "Copy message", icon: <CopyIcon />, onClick: copy },
  { id: "retry", label: "Retry response", icon: <RetryIcon />, onClick: retry },
]} />`,
  },
  {
    id: "message-usage",
    title: "MessageUsage",
    group: "elements",
    description: "Compact input and output token metadata for a response.",
    Demo: MessageUsageDemo,
    code: `<MessageUsage inputTokens={1240} outputTokens={268} />`,
  },
] as const;

const subgroupById: Record<string, NonNullable<Entry["subgroup"]>> = {
  button: "actions",
  "icon-button": "actions",
  "message-actions": "actions",
  textarea: "inputs",
  badge: "feedback",
  spinner: "feedback",
  "thinking-dots": "feedback",
  skeleton: "feedback",
  shimmer: "feedback",
  tooltip: "feedback",
  card: "layout",
  separator: "layout",
  "scroll-area": "layout",
  code: "content",
  "streaming-markdown": "content",
  kbd: "content",
  "message-usage": "content",
};

const knobsById: Record<string, Entry["knobs"]> = {
  button: [
    { prop: "variant", label: "Variant", kind: "pick", options: ["primary", "secondary", "ghost", "danger"], defaultValue: "primary" },
    { prop: "size", label: "Size", kind: "pick", options: ["sm", "md"], defaultValue: "md" },
    { prop: "label", label: "Label", kind: "text", defaultValue: "Run agent" },
    { prop: "disabled", label: "Disabled", kind: "toggle", defaultValue: false },
  ],
  "icon-button": [
    { prop: "variant", label: "Variant", kind: "pick", options: ["primary", "secondary", "ghost", "danger"], defaultValue: "secondary" },
    { prop: "size", label: "Size", kind: "pick", options: ["sm", "md"], defaultValue: "md" },
    { prop: "disabled", label: "Disabled", kind: "toggle", defaultValue: false },
  ],
  badge: [
    { prop: "tone", label: "Tone", kind: "pick", options: ["neutral", "accent", "success", "warning", "danger"], defaultValue: "neutral" },
    { prop: "label", label: "Label", kind: "text", defaultValue: "Tool complete" },
  ],
  card: [
    { prop: "title", label: "Title", kind: "text", defaultValue: "Workspace change" },
    { prop: "showFooter", label: "Show footer", kind: "toggle", defaultValue: true },
  ],
  code: [
    { prop: "block", label: "Block", kind: "toggle", defaultValue: true },
    { prop: "language", label: "Language", kind: "pick", options: ["ts", "tsx", "js"], defaultValue: "ts" },
  ],
  "streaming-markdown": [{ prop: "chunkSize", label: "Chunk size", kind: "number", defaultValue: 3, min: 1, max: 12, step: 1 }],
  spinner: [
    { prop: "label", label: "Accessible label", kind: "text", defaultValue: "Running tool" },
    { prop: "visible", label: "Loading", kind: "toggle", defaultValue: true },
  ],
  "thinking-dots": [{ prop: "visible", label: "Thinking", kind: "toggle", defaultValue: true }],
  skeleton: [{ prop: "loaded", label: "Loaded", kind: "toggle", defaultValue: false }],
  shimmer: [{ prop: "active", label: "Active", kind: "toggle", defaultValue: true }],
  separator: [{ prop: "orientation", label: "Orientation", kind: "pick", options: ["horizontal", "vertical"], defaultValue: "horizontal" }],
  "scroll-area": [{ prop: "items", label: "Items", kind: "number", defaultValue: 6, min: 3, max: 14, step: 1 }],
  tooltip: [{ prop: "content", label: "Content", kind: "text", defaultValue: "Replay the recorded session" }],
  kbd: [{ prop: "shortcut", label: "Shortcut", kind: "text", defaultValue: "Ctrl K" }],
  textarea: [
    { prop: "placeholder", label: "Placeholder", kind: "text", defaultValue: "Ask the agent to inspect a file" },
    { prop: "disabled", label: "Disabled", kind: "toggle", defaultValue: false },
  ],
  "message-actions": [{ prop: "disabled", label: "Disabled", kind: "toggle", defaultValue: false }],
  "message-usage": [
    { prop: "inputTokens", label: "Input tokens", kind: "number", defaultValue: 1240, min: 0, max: 10000, step: 10 },
    { prop: "outputTokens", label: "Output tokens", kind: "number", defaultValue: 268, min: 0, max: 10000, step: 10 },
  ],
};

function codeFor(id: string, values: DemoProps["values"]): string {
  switch (id) {
    case "button": {
      const variant = stringValue(values, "variant", "primary");
      const size = stringValue(values, "size", "md");
      const label = stringValue(values, "label", "Run agent");
      const disabled = booleanValue(values, "disabled");
      return `<Button variant="${variant}" size="${size}"${disabled ? " disabled" : ""}>\n  ${label}\n</Button>`;
    }
    case "icon-button": return `<IconButton label="Pin message" variant="${stringValue(values, "variant", "secondary")}" size="${stringValue(values, "size", "md")}"${booleanValue(values, "disabled") ? " disabled" : ""}>P</IconButton>`;
    case "badge": return `<Badge tone="${stringValue(values, "tone", "neutral")}">${stringValue(values, "label", "Tool complete")}</Badge>`;
    case "card": return `<Card>\n  <CardHeader>${stringValue(values, "title", "Workspace change")}</CardHeader>\n  <CardContent>Two files will change.</CardContent>${booleanValue(values, "showFooter", true) ? "\n  <CardFooter><Button variant=\"primary\">Approve</Button></CardFooter>" : ""}\n</Card>`;
    case "code": return booleanValue(values, "block", true) ? `<Code block language="${stringValue(values, "language", "ts")}">{source}</Code>` : `<Code>createReplayDriver()</Code>`;
    case "streaming-markdown": return `<StreamingMarkdown>{assistantText}</StreamingMarkdown>`;
    case "spinner": return booleanValue(values, "visible", true) ? `<Spinner label="${stringValue(values, "label", "Running tool")}" />` : `{loading ? <Spinner /> : null}`;
    case "thinking-dots": return booleanValue(values, "visible", true) ? `<ThinkingDots />` : `{waiting ? <ThinkingDots /> : null}`;
    case "skeleton": return booleanValue(values, "loaded") ? `<Message />` : `<Skeleton className="message-line" />`;
    case "shimmer": return booleanValue(values, "active", true) ? `<Shimmer className="summary-placeholder" />` : `<Summary />`;
    case "separator": return `<Separator orientation="${stringValue(values, "orientation", "horizontal")}" />`;
    case "scroll-area": return `<ScrollArea>{events.slice(0, ${numberValue(values, "items", 6)}).map(renderEvent)}</ScrollArea>`;
    case "tooltip": return `<Tooltip content="${stringValue(values, "content", "Replay the recorded session")}">\n  <Button variant="secondary">Hover or focus</Button>\n</Tooltip>`;
    case "kbd": return `<Kbd>${stringValue(values, "shortcut", "Ctrl K")}</Kbd>`;
    case "textarea": return `<Textarea placeholder="${stringValue(values, "placeholder", "Ask the agent to inspect a file")}"${booleanValue(values, "disabled") ? " disabled" : ""} />`;
    case "message-actions": return `<MessageActions actions={actions}${booleanValue(values, "disabled") ? " /* actions disabled */" : ""} />`;
    case "message-usage": return `<MessageUsage inputTokens={${numberValue(values, "inputTokens", 1240)}} outputTokens={${numberValue(values, "outputTokens", 268)}} />`;
    default: return "";
  }
}

const propsById: Record<string, Entry["props"]> = {
  button: [
    { name: "variant", type: '"primary" | "secondary" | "ghost" | "danger"', defaultValue: '"ghost"', description: "Ghost-first action hierarchy; reserve primary for the one true action." },
    { name: "size", type: '"sm" | "md"', defaultValue: '"md"', description: "Control height and horizontal padding." },
    { name: "disabled", type: "boolean", defaultValue: "false", description: "Prevents interaction and communicates unavailability." },
  ],
  "icon-button": [{ name: "label", type: "string", defaultValue: "required", description: "Accessible name for the icon-only action." }],
  badge: [{ name: "tone", type: '"neutral" | "accent" | "success" | "warning" | "danger"', defaultValue: '"neutral"', description: "Semantic color treatment." }],
  card: [{ name: "children", type: "ReactNode", defaultValue: "required", description: "Card regions or custom content." }],
  code: [{ name: "block", type: "boolean", defaultValue: "false", description: "Switches between inline and highlighted block rendering." }],
  "streaming-markdown": [{ name: "children", type: "string", defaultValue: "required", description: "The current accumulated Markdown text." }],
  spinner: [{ name: "label", type: "string", defaultValue: '"Loading"', description: "Accessible status label." }],
  "thinking-dots": [{ name: "className", type: "string", defaultValue: "undefined", description: "Optional layout class." }],
  skeleton: [{ name: "className", type: "string", defaultValue: "undefined", description: "Defines the placeholder shape." }],
  shimmer: [{ name: "className", type: "string", defaultValue: "undefined", description: "Defines the animated region shape." }],
  separator: [{ name: "orientation", type: '"horizontal" | "vertical"', defaultValue: '"horizontal"', description: "Axis used to divide adjacent content." }],
  "scroll-area": [{ name: "children", type: "ReactNode", defaultValue: "required", description: "Scrollable bounded content." }],
  tooltip: [{ name: "content", type: "ReactNode", defaultValue: "required", description: "Context shown on hover and keyboard focus." }],
  kbd: [{ name: "children", type: "ReactNode", defaultValue: "required", description: "Key or chord label." }],
  textarea: [{ name: "...props", type: "TextareaHTMLAttributes", defaultValue: "none", description: "Native textarea props with Fraym styling." }],
  "message-actions": [{ name: "actions", type: "readonly MessageAction[]", defaultValue: "required", description: "Typed action definitions rendered as accessible icon buttons." }],
  "message-usage": [{ name: "inputTokens", type: "number", defaultValue: "undefined", description: "Input token count, compactly formatted." }, { name: "outputTokens", type: "number", defaultValue: "undefined", description: "Output token count, compactly formatted." }],
};

const originalElementEntries = baseElementEntries.map((entry): Entry => {
  const componentNames = entry.id === "card" ? "Card, CardHeader, CardContent, CardFooter" : entry.title;
  const subgroup = subgroupById[entry.id];
  return {
    ...entry,
    ...(subgroup === undefined ? {} : { subgroup }),
    tier: "Element",
    importCode: `import { ${componentNames} } from "@fraym/ui"`,
    knobs: knobsById[entry.id] ?? [],
    code: (values) => codeFor(entry.id, values),
    examples: [
      { title: "Basic", description: `A focused ${entry.title} usage.`, code: entry.code },
      { title: "Composed", description: "Combine it with neighboring Fraym elements.", code: `<Card>\n  <CardContent>${entry.code.split("\n")[0]}</CardContent>\n</Card>` },
    ],
    props: propsById[entry.id] ?? [],
  };
});

export const elementEntries: readonly Entry[] = [...originalElementEntries, ...additionalElementEntries, ...decorativeElementEntries, ...rendererContractEntries];

