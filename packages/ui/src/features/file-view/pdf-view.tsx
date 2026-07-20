/// <reference path="../../asset-imports.d.ts" />
"use client";

// PdfView — renders a PDF to canvases with pdfjs-dist (the same engine Synara
// uses). Accepts a URL or raw bytes; the worker is wired as a Vite `?url` asset
// so it ships without a CDN. A small toolbar controls zoom + shows page count.

import { useEffect, useRef, useState } from "react";
import { Icon } from "../../icons/icon";
import { cn } from "../../lib/cn";

// Dynamic imports by necessity: pdfjs-dist touches browser globals (DOMMatrix)
// at module init, and the `?url` worker specifier is a Vite-only virtual module
// — static imports crash any non-browser, non-Vite loader (bun test, node).
// Resolved once, lazily, the first time a PDF actually renders.
type PdfJsModule = typeof import("pdfjs-dist");
let pdfjsRuntime: Promise<PdfJsModule> | null = null;
function loadPdfJs(): Promise<PdfJsModule> {
	pdfjsRuntime ??= Promise.all([
		import("pdfjs-dist"),
		import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
	]).then(([pdfjs, worker]) => {
		pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
		return pdfjs;
	});
	return pdfjsRuntime;
}

export interface PdfViewProps {
	readonly src: string | Uint8Array;
	readonly className?: string;
}

export function PdfView({ src, className }: PdfViewProps) {
	const pagesRef = useRef<HTMLDivElement>(null);
	const [pageCount, setPageCount] = useState(0);
	const [scale, setScale] = useState(1.1);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;
		const container = pagesRef.current;
		setError(null);
		// pdfjs transfers (detaches) the data buffer to its worker; clone so a shared
		// bytes source survives re-renders (scale change, StrictMode double-invoke).
		const task = loadPdfJs().then(pdfjs =>
			pdfjs.getDocument(typeof src === "string" ? { url: src } : { data: src.slice() }).promise,
		);
		task
			.then(async doc => {
				if (cancelled) return;
				setPageCount(doc.numPages);
				if (!container) return;
				container.replaceChildren();
				for (let n = 1; n <= doc.numPages; n += 1) {
					const page = await doc.getPage(n);
					if (cancelled) return;
					const viewport = page.getViewport({ scale });
					const canvas = document.createElement("canvas");
					canvas.width = viewport.width;
					canvas.height = viewport.height;
					canvas.className = "mx-auto mb-3 max-w-full rounded-[6px] border border-fr-border-soft";
					const ctx = canvas.getContext("2d");
					if (!ctx) continue;
					container.appendChild(canvas);
					await page.render({ canvasContext: ctx, viewport, canvas }).promise;
				}
			})
			.catch(reason => {
				if (!cancelled) setError(reason instanceof Error ? reason.message : String(reason));
			});
		return () => {
			cancelled = true;
		};
	}, [src, scale]);

	return (
		<div data-slot="pdf-view" className={cn("flex h-full min-h-0 flex-col bg-fr-bg", className)}>
			<div className="flex shrink-0 items-center gap-2 border-b border-fr-border-soft px-3 py-1.5">
				<Icon name="file" size={13} strokeWidth={1.8} className="text-fr-del" />
				<span className="font-secondary text-fr-2xs text-fr-text-3">
					{pageCount > 0 ? `${pageCount} page${pageCount === 1 ? "" : "s"}` : "PDF"}
				</span>
				<span className="flex-1" />
				<button
					type="button"
					aria-label="Zoom out"
					onClick={() => setScale(value => Math.max(0.5, Math.round((value - 0.2) * 10) / 10))}
					className="flex size-6 items-center justify-center rounded-[6px] text-fr-text-3 hover:bg-fr-surface hover:text-fr-text"
				>
					<Icon name="minus" size={13} strokeWidth={2} />
				</button>
				<span className="w-9 text-center font-secondary text-fr-2xs text-fr-text-2 tabular-nums">
					{Math.round(scale * 100)}%
				</span>
				<button
					type="button"
					aria-label="Zoom in"
					onClick={() => setScale(value => Math.min(3, Math.round((value + 0.2) * 10) / 10))}
					className="flex size-6 items-center justify-center rounded-[6px] text-fr-text-3 hover:bg-fr-surface hover:text-fr-text"
				>
					<Icon name="plus" size={13} strokeWidth={2} />
				</button>
			</div>
			{error ? (
				<div className="flex flex-1 items-center justify-center px-4 text-center font-secondary text-fr-xs text-fr-del">
					Failed to render PDF: {error}
				</div>
			) : (
				<div ref={pagesRef} className="min-h-0 flex-1 overflow-auto p-3" />
			)}
		</div>
	);
}
