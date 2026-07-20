// ImageBlock — inline image / screenshot / browser-capture with click-to-zoom.
//
// Better-UX-than-TUI: terminals fake images via sixel/kitty; the web renders
// them inline with a real lightbox (zoom, Escape/backdrop to close, lazy load).

import { type ReactNode, useEffect, useState } from "react";
import { renderTextWithMentions } from "../../../elements/file-mention";
import { BodyPortal } from "../../../lib/body-portal";
import { cn } from "../../../lib/cn";

export interface ImageBlockProps {
	readonly src: string;
	readonly alt?: string;
	readonly caption?: string;
	/** Inline max height in px before the user zooms (default 320). */
	readonly maxHeight?: number;
	/** Render as a small bounded thumbnail (user/agent message images) instead of a large
	 *  inline preview; clicking still opens the full-size lightbox. */
	readonly thumbnail?: boolean;
	readonly className?: string;
}

// Cap a message-image thumbnail to a small box (composer attachment chips are 56px;
// give transcript thumbnails a touch more room while staying clearly a thumbnail).
const THUMBNAIL_MAX_PX = 96;

/** Fullscreen image lightbox: dim backdrop + Escape/click to close, body-portaled so a
 *  transformed/overflow ancestor can't re-origin the fixed overlay. Shared by the transcript
 *  ImageBlock and the composer attachment tray so both zoom identically. */
export function ImageLightbox({
	src,
	alt = "",
	onClose,
}: {
	readonly src: string;
	readonly alt?: string;
	readonly onClose: () => void;
}) {
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key !== "Escape" || e.isComposing) return;
			e.preventDefault();
			onClose();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [onClose]);
	return (
		<BodyPortal>
			<div
				data-slot="image-lightbox"
				onClick={onClose}
				className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 p-6 backdrop-blur-sm"
			>
				<button
					type="button"
					onClick={onClose}
					className="absolute top-4 right-4 flex size-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
					aria-label="Close"
				>
					&#10005;
				</button>
				<img src={src} alt={alt} className="max-h-full max-w-full rounded-md object-contain" />
			</div>
		</BodyPortal>
	);
}

export function ImageBlock({ src, alt = "", caption, maxHeight = 320, thumbnail = false, className }: ImageBlockProps) {
	const [zoomed, setZoomed] = useState(false);

	return (
		<figure data-slot="image-block" className={cn("my-2 inline-block max-w-full", className)}>
			<button
				type="button"
				onClick={() => setZoomed(true)}
				className={cn(
					"block overflow-hidden rounded-[var(--fr-r)] border border-fr-border-soft bg-fr-surface transition-opacity hover:opacity-90",
					thumbnail && "cursor-zoom-in",
				)}
				aria-label={alt || "Open image"}
			>
				<img
					src={src}
					alt={alt}
					loading="lazy"
					style={thumbnail ? { maxHeight: THUMBNAIL_MAX_PX, maxWidth: THUMBNAIL_MAX_PX } : { maxHeight }}
					className="block h-auto max-w-full object-contain"
				/>
			</button>
			{caption && <figcaption className="mt-1 text-fr-xs text-fr-text-3">{caption}</figcaption>}
			{zoomed && <ImageLightbox src={src} alt={alt} onClose={() => setZoomed(false)} />}
		</figure>
	);
}

// Inline image glyph (mirrors the composer's `createImageIconElement`). Hand-rolled
// SVG rather than the `icons` barrel on purpose: that barrel transitively loads
// `customElements`, which pollutes the cross-file test env this component is unit-tested in.
function ImageGlyph({ size = 13 }: { readonly size?: number }) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={2}
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
			className="shrink-0"
		>
			<rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
			<circle cx="9" cy="9" r="2" />
			<path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
		</svg>
	);
}

/** The "Image N" reference chip — visually identical to the composer's image pill
 *  (`mention-editor` `buildImagePill`), so a sent/queued bubble references its
 *  attachments exactly like the composer that produced them. */
export function ImageRefPill({ number }: { readonly number: number }) {
	return (
		<span
			data-image-pill=""
			className="inline-flex select-none items-center gap-1 rounded-[6px] bg-fr-surface-2 px-1.5 py-0.5 align-middle font-secondary text-[0.85em] font-medium text-fr-text-2"
		>
			<ImageGlyph size={13} />
			<span data-image-label="">Image {number}</span>
		</span>
	);
}

/** A user message's image attachment — a ready-to-render data URL (or any image URL). */
export interface UserImageAttachment {
	readonly src: string;
}

/** Thumbnail row + numbered "Image N" pills for a user message's images — the same
 *  shape the composer shows (thumbnail tray + reference pills). Shared by the queued
 *  "ghost" bubble and the sent user bubble so all three render identically. */
export function UserImageAttachments({ images }: { readonly images: readonly UserImageAttachment[] }) {
	if (images.length === 0) return null;
	return (
		<div data-slot="user-image-attachments" className="flex flex-col gap-1.5">
			<div className="flex flex-wrap gap-2">
				{images.map((att, i) => (
					<ImageBlock
						key={`thumb:${att.src.slice(-24)}:${i}`}
						src={att.src}
						alt={`Image ${i + 1}`}
						thumbnail
						className="my-0"
					/>
				))}
			</div>
			<div className="flex flex-wrap gap-1">
				{images.map((att, i) => (
					<ImageRefPill key={`pill:${att.src.slice(-24)}:${i}`} number={i + 1} />
				))}
			</div>
		</div>
	);
}

/** A wrapped row of small image thumbnails — the composer's top tray. Used by the sent
 *  and queued bubbles alongside inline "Image N" pills. */
export function UserImageThumbnails({ images }: { readonly images: readonly UserImageAttachment[] }) {
	if (images.length === 0) return null;
	return (
		<div className="flex flex-wrap gap-2">
			{images.map((att, i) => (
				<ImageBlock
					key={`thumb:${att.src.slice(-24)}:${i}`}
					src={att.src}
					alt={`Image ${i + 1}`}
					thumbnail
					className="my-0"
				/>
			))}
		</div>
	);
}

/** Matches the TUI's `[Image #N]` / `[Image #N, WxH]` position marker (modes/image-references.ts). */
const IMAGE_MARKER_RE = /\[Image #([1-9]\d*)(?:,[^\]\n]*)?\]/g;

/** Render a user message's text with inline "Image N" pills at the positions of the `[Image #N]`
 *  markers in the text — the TUI's mechanism: position lives IN the text, so it survives the
 *  engine echo + reload (no hoisting to the end). `@path` mentions stay clickable. */
export function renderTextWithImageMarkers(text: string, keyPrefix: string): ReactNode[] {
	const nodes: ReactNode[] = [];
	let last = 0;
	let i = 0;
	IMAGE_MARKER_RE.lastIndex = 0;
	for (let m = IMAGE_MARKER_RE.exec(text); m !== null; m = IMAGE_MARKER_RE.exec(text)) {
		if (m.index > last) nodes.push(...renderTextWithMentions(text.slice(last, m.index), `${keyPrefix}-t${i}`));
		nodes.push(<ImageRefPill key={`${keyPrefix}-p${i}`} number={Number(m[1])} />);
		last = m.index + m[0].length;
		i++;
	}
	if (last < text.length) nodes.push(...renderTextWithMentions(text.slice(last), `${keyPrefix}-tend`));
	return nodes;
}
