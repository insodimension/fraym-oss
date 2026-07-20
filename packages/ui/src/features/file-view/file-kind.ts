// Maps a path (+ optional MIME) to the renderer kind. This is the registry key
// that FileView routes on — the thing neither Synara nor Happier built (both
// branch ad-hoc). Extension tables are Records (static lookups).

export type FileViewKind = "code" | "markdown" | "image" | "svg" | "pdf" | "html" | "binary";

const IMAGE_EXTS: Record<string, true> = {
	png: true,
	jpg: true,
	jpeg: true,
	gif: true,
	webp: true,
	bmp: true,
	ico: true,
	avif: true,
};

const MARKDOWN_EXTS: Record<string, true> = { md: true, markdown: true, mdx: true };

const BINARY_EXTS: Record<string, true> = {
	exe: true,
	dll: true,
	so: true,
	dylib: true,
	bin: true,
	dat: true,
	wasm: true,
	ttf: true,
	otf: true,
	woff: true,
	woff2: true,
	eot: true,
	mp4: true,
	webm: true,
	mov: true,
	avi: true,
	mkv: true,
	mp3: true,
	wav: true,
	flac: true,
	ogg: true,
	zip: true,
	tar: true,
	gz: true,
	tgz: true,
	bz2: true,
	"7z": true,
	rar: true,
	class: true,
	o: true,
	a: true,
	lib: true,
	db: true,
	sqlite: true,
	sqlite3: true,
};

export function fileExtension(path: string): string {
	const base = path.split(/[\\/]/).pop() ?? path;
	const dot = base.lastIndexOf(".");
	return dot > 0 ? base.slice(dot + 1).toLowerCase() : "";
}

export function resolveFileKind(path: string, mime?: string): FileViewKind {
	if (mime) {
		if (mime === "image/svg+xml") return "svg";
		if (mime.startsWith("image/")) return "image";
		if (mime === "application/pdf") return "pdf";
		if (mime === "text/html") return "html";
		if (mime === "text/markdown") return "markdown";
	}
	const ext = fileExtension(path);
	if (ext === "svg") return "svg";
	if (IMAGE_EXTS[ext]) return "image";
	if (ext === "pdf") return "pdf";
	if (ext === "html" || ext === "htm") return "html";
	if (MARKDOWN_EXTS[ext]) return "markdown";
	if (BINARY_EXTS[ext]) return "binary";
	return "code";
}
