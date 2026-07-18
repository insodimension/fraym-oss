import type { ReactNode } from "react";
import { Badge } from "../../elements/badge";
import { StaticMarkdownLite } from "../../elements/static-markdown-lite";
import type { SurfaceRenderInput } from "../../registries/surface-renderer-registry";
import { classNames } from "../../elements/utils";

export type MessageSurfaceTone = "neutral" | "info" | "success" | "warning" | "danger";
export interface MessageSurfaceProps { readonly label: string; readonly title?: string; readonly text?: string; readonly detail?: ReactNode; readonly tone?: MessageSurfaceTone; readonly className?: string }
export function MessageSurface({ label, title, text, detail, tone = "neutral", className }: MessageSurfaceProps) { return <section className={classNames("fraym-message-surface", `fraym-message-surface--${tone}`, className)}><header><Badge tone={tone === "danger" ? "del" : tone === "warning" ? "warn" : tone === "success" ? "add" : tone === "info" ? "accent" : "mute"}>{label}</Badge>{title ? <strong>{title}</strong> : null}</header>{text ? <StaticMarkdownLite text={text} /> : null}{detail}</section>; }
export function surfaceText(input: SurfaceRenderInput): string { return input.channel === "message" ? input.text ?? (typeof input.payload === "string" ? input.payload : "") : input.request.message ?? ""; }
export function renderNeutralMessageSurface(label: string, tone: MessageSurfaceTone = "neutral") { return (input: SurfaceRenderInput): ReactNode => <MessageSurface label={label} text={surfaceText(input)} tone={tone} />; }
