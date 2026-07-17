import type { ReactNode } from "react"; import type { SurfaceRenderInput } from "../../registries/surface-renderer-registry"; import { MessageSurface, surfaceText } from "./surface-messages";
export interface SkillPromptFields { readonly name: string; readonly args?: string; readonly path?: string }
export function parseSkillPromptText(raw: string): SkillPromptFields { const match = raw.trim().match(/^\/?([^\s]+)(?:\s+([\s\S]*))?$/); return { name: match?.[1] ?? "Command", ...(match?.[2] ? { args: match[2] } : {}) }; }
export function resolveSkillPrompt(input: SurfaceRenderInput): SkillPromptFields | null { const text = surfaceText(input); return text.trim() ? parseSkillPromptText(text) : null; }
export function SkillPromptSurface({ fields }: { readonly fields: SkillPromptFields }) { return <MessageSurface label="Command" {...(fields.args ? { text: fields.args } : {})} title={`/${fields.name}`} />; }
export function renderSkillPrompt(input: SurfaceRenderInput): ReactNode { const fields = resolveSkillPrompt(input); return fields ? <SkillPromptSurface fields={fields} /> : null; }
