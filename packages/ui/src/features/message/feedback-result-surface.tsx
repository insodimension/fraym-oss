import type { ReactNode } from "react"; import type { SurfaceRenderInput } from "../../registries/surface-renderer-registry"; import { MessageSurface, surfaceText } from "./surface-messages";
export type FeedbackStatus = "sent" | "flushed" | "queued" | "rejected" | "cancelled" | "usage" | "empty" | "info";
export interface FeedbackResultFields { readonly status: FeedbackStatus; readonly message: string }
export function statusFromText(raw: string): FeedbackStatus { const value = raw.toLowerCase(); return value.includes("reject") ? "rejected" : value.includes("cancel") ? "cancelled" : value.includes("queue") ? "queued" : value.includes("flush") ? "flushed" : value.includes("sent") ? "sent" : value.includes("usage") ? "usage" : value.trim() ? "info" : "empty"; }
export function parseFeedbackResultText(raw: string): FeedbackResultFields { return { status: statusFromText(raw), message: raw.trim() || "No feedback was recorded." }; }
export function resolveFeedbackResult(input: SurfaceRenderInput): FeedbackResultFields | null { return parseFeedbackResultText(surfaceText(input)); }
export function FeedbackResultSurface({ fields }: { readonly fields: FeedbackResultFields }) { return <MessageSurface label="Feedback" text={fields.message} tone={fields.status === "rejected" || fields.status === "cancelled" ? "danger" : fields.status === "sent" || fields.status === "flushed" ? "success" : "neutral"} />; }
export function renderFeedbackResult(input: SurfaceRenderInput): ReactNode { return <FeedbackResultSurface fields={parseFeedbackResultText(surfaceText(input))} />; }
