export type ConflictSide = "ours" | "base" | "theirs";
export type ConflictMarkerKind = "ours" | "base" | "sep" | "theirs";
export type ConflictLineRole = "normal" | ConflictSide | `marker-${ConflictMarkerKind}`;
export interface ConflictLine { readonly number: number; readonly text: string; readonly role: ConflictLineRole }
export function hasConflictMarkers(text: string | undefined): boolean { return Boolean(text && /^<{7}|^={7}|^>{7}/m.test(text)); }
export function parseConflictLines(text: string, startLine = 1): readonly ConflictLine[] { let side: ConflictSide | null = null; return text.split(/\r?\n/).map((line, index) => { let role: ConflictLineRole = side ?? "normal"; if (line.startsWith("<<<<<<<")) { side = "ours"; role = "marker-ours"; } else if (line.startsWith("|||||||")) { side = "base"; role = "marker-base"; } else if (line.startsWith("=======")) { side = "theirs"; role = "marker-sep"; } else if (line.startsWith(">>>>>>>")) { role = "marker-theirs"; side = null; } return { number: startLine + index, text: line, role }; }); }
export function buildConflictDiffFile(text: string, path: string) { return hasConflictMarkers(text) ? { path, lines: parseConflictLines(text) } : null; }
