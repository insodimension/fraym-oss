// model-drag — the shared payload + drag-image for dragging a MODEL between
// surfaces (catalog list → role well, dossier → team panel). Mirrors the
// task-board's `task-drag` convention: a dedicated mime type, typed
// write/has/read helpers, and a compact branded chip as the cursor image
// replacing the browser's default row ghost.
//
// One native trick beyond task-drag: `dragover` handlers cannot READ data
// (spec: dataTransfer is protected mid-flight) but CAN read the TYPE LIST —
// so capability flags ride as extra types (`…-vision`), letting vision-gated
// wells refuse a text-only model LIVE during hover, not only on drop.

import { providerBrand } from "../settings/provider-brand";

export const FRAYM_MODEL_DRAG_TYPE = "application/x-fraym-model";
/** Present in `types` when the dragged model can see images. */
export const FRAYM_MODEL_DRAG_VISION_TYPE = "application/x-fraym-model-vision";

/** A model in flight — identity + the display bits the drop target needs. */
export interface ModelDragData {
	/** `provider/modelId` — the pattern role stacks store. */
	readonly pattern: string;
	readonly label: string;
	readonly providerId: string;
	readonly providerName: string;
	readonly vision?: boolean;
}

/** Stamp a model onto a drag (plus `text/plain` pattern fallback for foreign drops). */
export function writeModelDragData(dataTransfer: DataTransfer, data: ModelDragData): void {
	dataTransfer.setData(FRAYM_MODEL_DRAG_TYPE, JSON.stringify(data));
	if (data.vision) dataTransfer.setData(FRAYM_MODEL_DRAG_VISION_TYPE, "1");
	dataTransfer.setData("text/plain", data.pattern);
}

/** A model drag is in progress — readable during dragover (where getData is blocked). */
export function hasModelDragData(dataTransfer: DataTransfer): boolean {
	return Array.from(dataTransfer.types).includes(FRAYM_MODEL_DRAG_TYPE);
}

/** The in-flight model can see images — readable during dragover via the type list. */
export function modelDragSeesImages(dataTransfer: DataTransfer): boolean {
	return Array.from(dataTransfer.types).includes(FRAYM_MODEL_DRAG_VISION_TYPE);
}

/** Recover the model from a drop. Falls back to a bare `text/plain` pattern
 *  (older surfaces) so cross-version drags still land. */
export function readModelDragData(dataTransfer: DataTransfer): ModelDragData | null {
	const raw = dataTransfer.getData(FRAYM_MODEL_DRAG_TYPE);
	if (raw) {
		try {
			const parsed = JSON.parse(raw) as Partial<ModelDragData>;
			if (
				typeof parsed.pattern === "string" &&
				typeof parsed.label === "string" &&
				typeof parsed.providerId === "string"
			) {
				return {
					pattern: parsed.pattern,
					label: parsed.label,
					providerId: parsed.providerId,
					providerName: typeof parsed.providerName === "string" ? parsed.providerName : parsed.providerId,
					vision: parsed.vision === true,
				};
			}
		} catch {
			// fall through to the plain-pattern fallback
		}
	}
	const pattern = dataTransfer.getData("text/plain");
	if (!pattern?.includes("/")) return null;
	const providerId = pattern.slice(0, pattern.indexOf("/"));
	return { pattern, label: pattern.slice(pattern.indexOf("/") + 1), providerId, providerName: providerId };
}

/** Set the branded drag-preview chip (provider tile · model name) as the cursor
 *  image. Mounted off-screen, snapshotted synchronously by `setDragImage`,
 *  removed next tick — the task-drag pattern. */
export function setModelDragImage(dataTransfer: DataTransfer, data: ModelDragData): void {
	if (typeof document === "undefined") return;
	const brand = providerBrand(data.providerId, data.providerName);
	const chip = document.createElement("div");
	chip.className =
		"pointer-events-none absolute top-[-1000px] left-0 z-[9999] flex max-w-[240px] items-center gap-2 rounded-full border border-fr-border bg-fr-surface py-1.5 pl-1.5 pr-3 font-secondary text-fr-text text-fr-xs shadow-[0_10px_30px_-10px_rgba(0,0,0,0.6)]";
	const tile = document.createElement("span");
	tile.className = "flex size-5 shrink-0 items-center justify-center rounded-[6px] text-[10px] font-semibold";
	tile.style.background = brand.logoUrl ? "var(--fr-surface-3)" : brand.tileBg;
	tile.style.color = brand.tileFg;
	if (brand.logoUrl) {
		const img = document.createElement("img");
		img.src = brand.logoUrl;
		img.className = "size-[62%] object-contain";
		if (brand.logoFilter) img.style.filter = brand.logoFilter;
		tile.appendChild(img);
	} else {
		tile.textContent = brand.fallback;
	}
	const label = document.createElement("span");
	label.className = "fr-overflow font-medium";
	label.textContent = data.label;
	chip.append(tile, label);
	document.body.appendChild(chip);
	dataTransfer.setDragImage(chip, 18, 16);
	setTimeout(() => chip.remove(), 0);
}
