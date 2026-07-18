// Material Icon Theme file/folder icons — the comprehensive VS Code icon set
// (~1250 glyphs, 1378 extensions, 2131 filenames). Resolution uses the theme's
// prebuilt manifest; SVGs are vendored under `src/vendor/material-icons/` and
// emitted as assets by the bundler via `new URL(..., import.meta.url)` (only the
// icons actually rendered ship to the browser). Full-color by design — these are
// brand glyphs, not tinted, matching VS Code.

import { cn } from "../lib/cn";
import manifest from "../vendor/material-icons.json";

interface MaterialManifest {
	readonly iconDefinitions: Record<string, { readonly iconPath: string }>;
	readonly fileNames: Record<string, string>;
	readonly fileExtensions: Record<string, string>;
	readonly folderNames: Record<string, string>;
	readonly folderNamesExpanded: Record<string, string>;
	readonly file: string;
	readonly folder: string;
	readonly folderExpanded: string;
}

const M = manifest as unknown as MaterialManifest;

/** iconName (manifest key) -> vendored svg basename (handles `.clone` variants). */
function iconFileFor(iconName: string): string | undefined {
	const def = M.iconDefinitions[iconName];
	if (!def) return undefined;
	return (def.iconPath.split("/").pop() ?? "").replace(/\.svg$/, "");
}

/** Resolve a path to a Material Icon Theme icon name (file or folder). */
export function resolveMaterialIconName(name: string, isDirectory = false, isOpen = false): string {
	const lower = name.toLowerCase();
	if (isDirectory) {
		const table = isOpen ? M.folderNamesExpanded : M.folderNames;
		return table[lower] ?? (isOpen ? M.folderExpanded : M.folder);
	}
	const byName = M.fileNames[lower];
	if (byName) return byName;
	// Longest extension suffix first, so `component.module.css` resolves on `module.css` then `css`.
	const parts = lower.split(".");
	for (let i = 1; i < parts.length; i += 1) {
		const hit = M.fileExtensions[parts.slice(i).join(".")];
		if (hit) return hit;
	}
	return M.file;
}

/** Resolve a path to the vendored SVG URL for its Material icon. */
export function materialIconUrl(path: string, isDirectory = false, isOpen = false): string {
	const name = path.split(/[\\/]/).pop() ?? path;
	const iconName = resolveMaterialIconName(name, isDirectory, isOpen);
	const file = iconFileFor(iconName) ?? iconFileFor(isDirectory ? M.folder : M.file) ?? "file";
	return new URL(`../vendor/material-icons/${file}.svg`, import.meta.url).href;
}

export interface FileTypeIconProps {
	readonly path: string;
	readonly isDirectory?: boolean;
	/** Expanded folder → open-folder glyph. */
	readonly isOpen?: boolean;
	readonly size?: number;
	readonly className?: string;
}

/** Full-color Material Icon Theme icon for a path (file or folder). */
export function FileTypeIcon({ path, isDirectory = false, isOpen = false, size = 16, className }: FileTypeIconProps) {
	return (
		<img
			src={materialIconUrl(path, isDirectory, isOpen)}
			width={size}
			height={size}
			alt=""
			draggable={false}
			className={cn("shrink-0", className)}
			style={{ minWidth: size }}
		/>
	);
}

/** Build the `<img>` both imperative pill icons share (full-color Material glyphs). */
function iconImg(src: string, size: number): HTMLImageElement {
	const img = document.createElement("img");
	img.src = src;
	img.width = size;
	img.height = size;
	img.alt = "";
	img.draggable = false;
	img.className = "shrink-0";
	img.style.minWidth = `${size}px`;
	return img;
}

/**
 * Imperative sibling of {@link FileTypeIcon} for DOM built outside React (the
 * contenteditable mention pills). Returns an `<img>` of the Material icon.
 */
export function createFileIconElement(path: string, isDirectory: boolean, size = 14): HTMLElement {
	return iconImg(materialIconUrl(path, isDirectory), size);
}

/** Imperative image-mention pill icon (the Material `image` glyph). */
export function createImageIconElement(size = 14): HTMLElement {
	return iconImg(new URL("../vendor/material-icons/image.svg", import.meta.url).href, size);
}
