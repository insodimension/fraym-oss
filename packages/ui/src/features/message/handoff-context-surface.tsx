import type { ReactNode } from "react"; import type { SurfaceRenderInput } from "../../registries/surface-renderer-registry"; import { MessageSurface, surfaceText } from "./surface-messages";
export function extractHandoffDocument(text: string): string { return text.replace(/^---[\s\S]*?---\s*/, "").trim(); }
export function HandoffContextSurface({ text }: { readonly text: string }) { return <MessageSurface label="Handoff context" text={extractHandoffDocument(text)} tone="info" />; }
export function renderHandoffContext(input: SurfaceRenderInput): ReactNode { return <HandoffContextSurface text={surfaceText(input)} />; }
