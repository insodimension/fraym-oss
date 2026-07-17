import { useState, type ReactNode } from "react";
import { Button } from "../elements/Button";
import { Card, CardContent, CardFooter, CardHeader } from "../elements/Card";
import { Input } from "../elements/Input";
import { Select } from "../elements/Select";
import { Textarea } from "../elements/Textarea";
import type { SurfaceRenderContext, SurfaceRendererEntry, SurfaceRenderInput } from "./surface-renderer-registry";

function payload(input: SurfaceRenderInput): Record<string, unknown> { const value = input.channel === "hostUi" ? input.request.payload : input.payload; return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function text(value: unknown, fallback = "") { return typeof value === "string" ? value : fallback; }
function HostQuestion({ input, context }: { input: Extract<SurfaceRenderInput, { channel: "hostUi" }>; context: SurfaceRenderContext }) {
  const data = payload(input); const options = Array.isArray(data.options) ? data.options.filter((option): option is string => typeof option === "string") : [];
  const [value, setValue] = useState(text(data.defaultValue));
  const respond = (accepted: boolean) => context.respond({ requestId: input.request.id, accepted, ...(accepted ? { value } : {}) });
  return <Card className="fraym-host-surface"><CardHeader><strong>{input.request.title ?? "Input requested"}</strong>{input.request.message ? <p>{input.request.message}</p> : null}</CardHeader><CardContent>{input.request.kind === "select" ? <Select aria-label={input.request.title ?? "Select an option"} options={options.map(option => ({ label: option, value: option }))} value={value} onChange={event => setValue(event.currentTarget.value)} /> : input.request.kind === "editor" ? <Textarea aria-label={input.request.title ?? "Editor"} rows={10} value={value} onChange={event => setValue(event.currentTarget.value)} /> : input.request.kind === "confirm" || input.request.kind === "permission" ? null : <Input aria-label={input.request.title ?? "Response"} value={value} onChange={event => setValue(event.currentTarget.value)} />}</CardContent><CardFooter><Button variant={input.request.kind === "permission" ? "primary" : "secondary"} onClick={() => respond(true)}>{input.request.kind === "permission" ? "Allow" : input.request.kind === "confirm" ? "Confirm" : "Submit"}</Button><Button variant="ghost" onClick={() => respond(false)}>Cancel</Button></CardFooter></Card>;
}
function renderQuestion(input: SurfaceRenderInput, context: SurfaceRenderContext): ReactNode { return input.channel === "hostUi" ? <HostQuestion context={context} input={input} /> : null; }
export function renderFallback(input: SurfaceRenderInput, context: SurfaceRenderContext): ReactNode {
  const label = input.channel === "hostUi" ? input.request.title ?? input.request.kind : input.customType;
  const detail = input.channel === "hostUi" ? input.request.message : input.text;
  return <Card className="fraym-host-surface"><CardHeader><strong>{label}</strong></CardHeader>{detail ? <CardContent>{detail}</CardContent> : null}{input.channel === "hostUi" ? <CardFooter><Button onClick={() => context.respond({ requestId: input.request.id, accepted: true })}>Continue</Button><Button variant="ghost" onClick={() => context.respond({ requestId: input.request.id, accepted: false })}>Dismiss</Button></CardFooter> : null}</Card>;
}
const message = (input: SurfaceRenderInput, context: SurfaceRenderContext) => renderFallback(input, context);
export const DEFAULT_SURFACE_RENDERERS: Record<string, SurfaceRendererEntry> = {
  "hostUi:input": { render: renderQuestion, placement: "docked" }, "hostUi:editor": renderQuestion, "hostUi:select": { render: renderQuestion, placement: "docked" }, "hostUi:permission": { render: renderQuestion, placement: "docked" }, "hostUi:confirm": { render: renderQuestion, placement: "docked" },
  "msg:advisor": message, "msg:async-result": message, "msg:feedback-result": message, "msg:handoff": message, "msg:skill-prompt": message, "msg:lsp-late-diagnostic": message,
};
