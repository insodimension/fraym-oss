import type { ReactNode } from "react"; import type { SurfaceRenderInput } from "../../registries/surface-renderer-registry"; import { MessageSurface, surfaceText } from "./surface-messages";
export interface BtwAnswerFields { readonly question?: string; readonly answer: string }
export function resolveBtwAnswer(input: SurfaceRenderInput): BtwAnswerFields | null { const text = surfaceText(input).trim(); if (!text) return null; const [question, ...answer] = text.split(/\r?\n/); return { ...(answer.length ? { question } : {}), answer: answer.length ? answer.join("\n") : question! }; }
export function BtwAnswerSurface({ fields }: { readonly fields: BtwAnswerFields }) { return <MessageSurface label="Aside" text={fields.answer} {...(fields.question ? { title: fields.question } : {})} />; }
export function renderBtwAnswer(input: SurfaceRenderInput): ReactNode { const fields = resolveBtwAnswer(input); return fields ? <BtwAnswerSurface fields={fields} /> : null; }
