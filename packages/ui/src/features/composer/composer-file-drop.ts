import { useEffect } from "react";
import {
	type ComposerImageAttachment,
	type ComposerPasteAttachment,
	isImageFile,
	readFileAttachment,
	readImageAttachment,
} from "./composer-core";
import { appendComposerAttachments, getActiveComposerDraftKey } from "./session-composer-draft";

/** Read a File list into composer attachments: images → base64 image attachments, every other file
 *  → a text/file chip (see {@link readFileAttachment}). Shared by drop, paste, and the attach button. */
export async function readFilesToAttachments(files: readonly File[]): Promise<{
	readonly images: ComposerImageAttachment[];
	readonly pasteAttachments: ComposerPasteAttachment[];
}> {
	const images = await Promise.all(
		files.filter(isImageFile).map(file => readImageAttachment(file, crypto.randomUUID())),
	);
	const pasteAttachments = await Promise.all(
		files.filter(file => !isImageFile(file)).map(file => readFileAttachment(file, crypto.randomUUID())),
	);
	return { images, pasteAttachments };
}

/** Read dropped/picked files and append them to a session's composer draft (route-to-active). */
export async function routeFilesToComposerDraft(key: string, files: readonly File[]): Promise<void> {
	if (files.length === 0) return;
	const { images, pasteAttachments } = await readFilesToAttachments(files);
	appendComposerAttachments(key, images, pasteAttachments);
}

/**
 * Global file-drop guard. Without it, a file dropped anywhere in the window makes the webview
 * NAVIGATE to that file — the whole app is replaced by the raw file with no way back (the P0). This
 * mounts one window-level dragover+drop pair that ALWAYS cancels that navigation for file drags, and
 * routes the files into the ACTIVE session's composer — unless a real drop zone (the composer field,
 * an upload panel) already handled the drop (`defaultPrevented`). Mount exactly once at the frame root.
 */
export function useGlobalFileDropGuard(): void {
	useEffect(() => {
		const hasFiles = (event: DragEvent): boolean =>
			!!event.dataTransfer && Array.from(event.dataTransfer.types).includes("Files");
		const onDragOver = (event: DragEvent) => {
			if (!hasFiles(event)) return;
			// Mark the whole window droppable so the drop event fires here (and never navigates).
			event.preventDefault();
			if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
		};
		const onDrop = (event: DragEvent) => {
			if (!hasFiles(event)) return;
			if (event.defaultPrevented) return; // an explicit drop zone (composer field, upload) took it
			event.preventDefault(); // stop the webview from opening the dropped file
			const key = getActiveComposerDraftKey();
			if (key === null || !event.dataTransfer) return;
			void routeFilesToComposerDraft(key, Array.from(event.dataTransfer.files));
		};
		window.addEventListener("dragover", onDragOver);
		window.addEventListener("drop", onDrop);
		return () => {
			window.removeEventListener("dragover", onDragOver);
			window.removeEventListener("drop", onDrop);
		};
	}, []);
}
