import { createContext, type ReactNode, useContext, useMemo } from "react";

import { FileTypeIcon } from "./FileTypeIcon";

export type FileMentionOpen = (path: string) => void;
interface FileMentionContextValue { openFile: FileMentionOpen; onReveal: ((path: string) => void) | null }
const FileMentionContext = createContext<FileMentionContextValue | null>(null);

export function FileMentionProvider({ openFile, onReveal = null, children }: { openFile: FileMentionOpen; onReveal?: ((path: string) => void) | null; children: ReactNode }) {
  const value = useMemo(() => ({ openFile, onReveal }), [openFile, onReveal]);
  return <FileMentionContext.Provider value={value}>{children}</FileMentionContext.Provider>;
}
export function useFileMentionOpen(): FileMentionOpen | null { return useContext(FileMentionContext)?.openFile ?? null; }
export function useFileMentionReveal(): ((path: string) => void) | null { return useContext(FileMentionContext)?.onReveal ?? null; }

export function joinWorkspacePath(root: string, relative: string): string { const base = root.replace(/[/\\]+$/, ""); const leaf = relative.replace(/^[/\\]+/, "").replace(/\/$/, ""); const separator = base.includes("\\") && !base.includes("/") ? "\\" : "/"; return leaf ? `${base}${separator}${leaf.split("/").join(separator)}` : base; }
export function revealLabel(): string { if (typeof navigator === "undefined") return "Open Containing Folder"; const platform = `${navigator.platform} ${navigator.userAgent}`; return /Mac/i.test(platform) ? "Reveal in Finder" : /Win/i.test(platform) ? "Show in Explorer" : "Open Containing Folder"; }

const fileExtensions = new Set(["ts", "tsx", "js", "jsx", "json", "md", "mdx", "css", "scss", "html", "py", "rs", "go", "rb", "c", "cpp", "h", "hpp", "sh", "yml", "yaml", "toml", "txt", "sql", "svg", "png", "jpg", "jpeg", "gif", "webp", "woff", "woff2", "zip", "lock", "env"]);
export function looksLikeFilePath(token: string): boolean { const value = token.trim(); if (!value || value.length > 200 || /[\s`'"()[\]{}<>|*?;,=]/.test(value) || /^https?:\/\//.test(value)) return false; if (value.includes("/")) return true; const extension = value.slice(value.lastIndexOf(".") + 1).toLowerCase(); return value.includes(".") && fileExtensions.has(extension); }

function basename(path: string): string { const normalized = path.replace(/\/$/, ""); return normalized.slice(normalized.lastIndexOf("/") + 1); }

export function FileMentionPill({ path, label, fallback }: { path: string; label?: string; fallback: ReactNode }) {
  const context = useContext(FileMentionContext);
  if (!context) return <>{fallback}</>;
  const directory = path.endsWith("/");
  return <button className="fraym-file-mention" data-slot="file-mention-pill" title={path} type="button" onClick={() => context.openFile(path)} onContextMenu={(event) => { if (!context.onReveal) return; event.preventDefault(); context.onReveal(path); }}><FileTypeIcon isDirectory={directory} path={path} size={12} /><span>{label ?? basename(path)}</span></button>;
}

const mentionPattern = /(^|\s)@([^\s@]*[./][^\s@]*)/g;
export function renderTextWithMentions(text: string, keyPrefix: string): ReactNode[] { const output: ReactNode[] = []; let cursor = 0; for (const match of text.matchAll(mentionPattern)) { const path = match[2] ?? ""; const start = (match.index ?? 0) + (match[1]?.length ?? 0); if (start > cursor) output.push(text.slice(cursor, start)); output.push(<FileMentionPill fallback={`@${path}`} key={`${keyPrefix}-${start}`} path={path} />); cursor = (match.index ?? 0) + match[0].length; } if (cursor < text.length) output.push(text.slice(cursor)); return output; }
