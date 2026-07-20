"use client";

// FileView — the multi-format renderer registry. Routes a file to the right
// surface by kind (code / markdown / image / svg / pdf / html / binary), the thing
// the current Shiki-only viewer lacks. Presentational: content/bytes arrive via
// props (mock in the kitchen-sink; a workspace bytes route in the real app).

import { type ReactNode, useState } from "react";
import { StreamingMarkdown } from "../../elements/streaming-markdown";
import { Icon } from "../../icons/icon";
import { cn } from "../../lib/cn";
import { CodeView } from "../code-view/code-view";
import { type FileViewKind, resolveFileKind } from "./file-kind";
import { PdfView } from "./pdf-view";

export interface FileViewProps {
	readonly path: string;
	/** Override the resolved kind. */
	readonly kind?: FileViewKind;
	readonly mime?: string;
	/** Text content for code / markdown / svg / html source. */
	readonly content?: string;
	/** Object/data URL for image or pdf. */
	readonly src?: string;
	/** Raw bytes for pdf (alternative to `src`). */
	readonly bytes?: Uint8Array;
	readonly revealLine?: number;
	readonly loading?: boolean;
	readonly emptyLabel?: ReactNode;
	readonly className?: string;
}

function ViewToggle({
	value,
	onChange,
}: {
	readonly value: "rendered" | "source";
	readonly onChange: (value: "rendered" | "source") => void;
}) {
	return (
		<div className="flex shrink-0 items-center gap-1 border-b border-fr-border-soft px-2 py-1.5">
			{(["rendered", "source"] as const).map(option => (
				<button
					key={option}
					type="button"
					data-state={value === option ? "active" : "inactive"}
					onClick={() => onChange(option)}
					className="rounded-[6px] px-2 py-0.5 font-primary text-fr-2xs capitalize text-fr-text-2 transition-colors hover:text-fr-text data-[state=active]:bg-fr-surface-2 data-[state=active]:text-fr-text"
				>
					{option}
				</button>
			))}
		</div>
	);
}

function ImageView({ src, path }: { readonly src?: string; readonly path: string }) {
	if (!src) return <BinaryView path={path} note="No image data." />;
	return (
		<div className="flex h-full min-h-0 items-center justify-center overflow-auto bg-fr-bg p-6 [background-image:repeating-conic-gradient(var(--fr-surface)_0%_25%,transparent_0%_50%)] [background-position:0_0] [background-size:20px_20px]">
			{/* eslint-disable-next-line @next/next/no-img-element */}
			<img
				src={src}
				alt={path}
				className="max-h-full max-w-full rounded-[6px] object-contain shadow-[0_8px_40px_rgba(0,0,0,0.4)]"
			/>
		</div>
	);
}

function SvgView({ content, src, path }: { readonly content?: string; readonly src?: string; readonly path: string }) {
	const [mode, setMode] = useState<"rendered" | "source">("rendered");
	const url = src ?? (content ? `data:image/svg+xml;utf8,${encodeURIComponent(content)}` : undefined);
	return (
		<div className="flex h-full min-h-0 flex-col">
			<ViewToggle value={mode} onChange={setMode} />
			{mode === "rendered" ? (
				<ImageView src={url} path={path} />
			) : (
				<CodeView content={content ?? ""} path={path} language="xml" className="min-h-0 flex-1" />
			)}
		</div>
	);
}

function HtmlView({ content, path }: { readonly content?: string; readonly path: string }) {
	const [mode, setMode] = useState<"rendered" | "source">("rendered");
	return (
		<div className="flex h-full min-h-0 flex-col">
			<ViewToggle value={mode} onChange={setMode} />
			{mode === "rendered" ? (
				<iframe title={path} sandbox="" srcDoc={content ?? ""} className="min-h-0 flex-1 border-0 bg-white" />
			) : (
				<CodeView content={content ?? ""} path={path} language="html" className="min-h-0 flex-1" />
			)}
		</div>
	);
}

function BinaryView({ path, note }: { readonly path: string; readonly note?: string }) {
	const name = path.split(/[\\/]/).pop() ?? path;
	return (
		<div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
			<div className="flex size-12 items-center justify-center rounded-[10px] border border-fr-border-soft bg-fr-surface">
				<Icon name="file" size={22} strokeWidth={1.6} className="text-fr-text-3" />
			</div>
			<p className="font-secondary text-fr-sm text-fr-text-2">{name}</p>
			<p className="max-w-[240px] font-secondary text-fr-xs text-fr-text-3">{note ?? "Binary file — not shown."}</p>
			<button
				type="button"
				className="mt-1 flex items-center gap-1.5 rounded-[7px] border border-fr-border bg-fr-surface px-3 py-1.5 font-primary text-fr-sm text-fr-text-2 transition-colors hover:bg-fr-surface-2 hover:text-fr-text"
			>
				<Icon name="download" size={13} strokeWidth={1.9} />
				Download
			</button>
		</div>
	);
}

function EmptyFileView({ label }: { readonly label: ReactNode }) {
	return (
		<div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
			<Icon name="file" size={20} strokeWidth={1.6} className="text-fr-text-3" />
			<p className="font-secondary text-fr-sm text-fr-text-3">{label}</p>
		</div>
	);
}

export function FileView({
	path,
	kind,
	mime,
	content,
	src,
	bytes,
	revealLine,
	loading,
	emptyLabel,
	className,
}: FileViewProps) {
	const resolved = kind ?? resolveFileKind(path, mime);

	const body = (() => {
		if (loading) return <EmptyFileView label="Loading…" />;
		switch (resolved) {
			case "markdown":
				return (
					<div className="h-full overflow-auto px-4 py-3">
						<StreamingMarkdown text={content ?? ""} />
					</div>
				);
			case "image":
				return <ImageView src={src} path={path} />;
			case "svg":
				return <SvgView content={content} src={src} path={path} />;
			case "html":
				return <HtmlView content={content} path={path} />;
			case "pdf":
				return src || bytes ? (
					<PdfView src={bytes ?? (src as string)} />
				) : (
					<BinaryView path={path} note="No PDF data." />
				);
			case "binary":
				return <BinaryView path={path} />;
			default:
				return content === undefined ? (
					<EmptyFileView label={emptyLabel ?? "Select a file to preview."} />
				) : (
					<CodeView content={content} path={path} revealLine={revealLine} className="h-full" />
				);
		}
	})();

	return (
		<div data-slot="file-view" className={cn("flex h-full min-h-0 flex-col bg-fr-bg", className)}>
			{body}
		</div>
	);
}
