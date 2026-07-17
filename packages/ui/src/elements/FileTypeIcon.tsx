import { classNames } from "./utils";

const iconKinds: Readonly<Record<string, string>> = { ts: "typescript", tsx: "react", js: "javascript", jsx: "react", json: "json", md: "markdown", css: "css", html: "html", py: "python", rs: "rust", go: "go", rb: "ruby", svg: "image", png: "image", jpg: "image", jpeg: "image", gif: "image", webp: "image", yml: "config", yaml: "config", toml: "config", lock: "lock" };
const iconColors: Readonly<Record<string, string>> = { typescript: "#519aba", react: "#61dafb", javascript: "#e5cd45", json: "#cbcb41", markdown: "#519aba", css: "#42a5f5", html: "#e44d26", python: "#ffd43b", rust: "#dea584", go: "#00add8", ruby: "#cc342d", image: "#a074c4", config: "#6d8086", lock: "#d8a657", file: "#8f9aa3", folder: "#dcb67a", "folder-open": "#e5c07b" };

export function resolveMaterialIconName(name: string, isDirectory = false, isOpen = false): string {
  if (isDirectory) return isOpen ? "folder-open" : "folder";
  const filename = name.split(/[\\/]/).pop()?.toLowerCase() ?? name.toLowerCase();
  if (filename === "package.json" || filename === "tsconfig.json") return "json";
  const extension = filename.split(".").pop() ?? "";
  return iconKinds[extension] ?? "file";
}

export function materialIconUrl(path: string, isDirectory = false, isOpen = false): string {
  const kind = resolveMaterialIconName(path, isDirectory, isOpen);
  const color = iconColors[kind] ?? iconColors.file;
  const label = kind === "folder" || kind === "folder-open" ? "◆" : (kind === "file" ? "·" : kind.slice(0, 2).toUpperCase());
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="18" rx="4" fill="${color}"/><text x="12" y="15.5" text-anchor="middle" font-family="Arial" font-size="7" font-weight="700" fill="#101114">${label}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export interface FileTypeIconProps { path: string; isDirectory?: boolean; isOpen?: boolean; size?: number; className?: string }
export function FileTypeIcon({ path, isDirectory = false, isOpen = false, size = 16, className }: FileTypeIconProps) { return <img alt="" className={classNames("fraym-file-type-icon", className)} draggable={false} height={size} src={materialIconUrl(path, isDirectory, isOpen)} style={{ minWidth: size }} width={size} />; }

function createIcon(path: string, isDirectory: boolean, size: number): HTMLImageElement { const image = document.createElement("img"); image.alt = ""; image.draggable = false; image.width = size; image.height = size; image.src = materialIconUrl(path, isDirectory); return image; }
export function createFileIconElement(path: string, isDirectory: boolean, size = 14): HTMLElement { return createIcon(path, isDirectory, size); }
export function createImageIconElement(size = 14): HTMLElement { return createIcon("image.png", false, size); }
