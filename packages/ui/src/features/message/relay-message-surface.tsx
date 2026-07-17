import type { ReactNode } from "react"; import type { SurfaceRenderInput } from "../../registries/surface-renderer-registry"; import { MessageSurface, surfaceText } from "./surface-messages";
export type RelayMessageKind = "incoming" | "relay" | "autoreply";
export interface RelayMessageFields { readonly kind: RelayMessageKind; readonly from?: string; readonly to?: string; readonly replyTo?: string; readonly body: string }
export function parseRelayIncomingText(raw: string) { const match = raw.match(/^([^:]+):\s*([\s\S]*)$/); return { from: match?.[1]?.trim() ?? "Unknown", body: match?.[2] ?? raw }; }
export function parseRelayText(raw: string) { const match = raw.match(/^([^>]+)>\s*([^:]+):\s*([\s\S]*)$/); return { from: match?.[1]?.trim() ?? "Unknown", to: match?.[2]?.trim() ?? "Unknown", body: match?.[3] ?? raw }; }
export function parseRelayAutoreplyText(raw: string) { const match = raw.match(/^([^:]+):\s*([\s\S]*)$/); return { to: match?.[1]?.trim() ?? "Unknown", body: match?.[2] ?? raw }; }
export function resolveRelayMessage(input: SurfaceRenderInput): RelayMessageFields | null { const text = surfaceText(input); return { kind: "incoming", ...parseRelayIncomingText(text) }; }
export function RelayMessageSurface({ fields }: { readonly fields: RelayMessageFields }) { return <MessageSurface label={fields.kind === "incoming" ? "Incoming" : fields.kind === "relay" ? "Relayed" : "Auto reply"} text={fields.body} title={[fields.from, fields.to].filter(Boolean).join(" → ")} />; }
export function renderRelayMessage(input: SurfaceRenderInput): ReactNode { const fields = resolveRelayMessage(input); return fields ? <RelayMessageSurface fields={fields} /> : null; }
