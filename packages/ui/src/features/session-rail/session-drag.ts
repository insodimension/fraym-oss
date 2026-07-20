import type { SessionRef } from "@fraym/driver";
import type { SessionItem } from "./session-rail";

const FRAYM_SESSION_DRAG_TYPE = "application/x-fraym-session";
export const FRAYM_SESSION_POINTER_DRAG_MOVE = "fraym:session-pointer-drag:move";
export const FRAYM_SESSION_POINTER_DRAG_DROP = "fraym:session-pointer-drag:drop";
export const FRAYM_SESSION_POINTER_DRAG_END = "fraym:session-pointer-drag:end";

export interface SessionDragData {
	readonly sessionRef: SessionRef;
	readonly title: string;
}

export interface SessionPointerDragDetail {
	readonly data: SessionDragData;
	readonly clientX: number;
	readonly clientY: number;
}

export function sessionDragDataFromItem(item: SessionItem): SessionDragData | null {
	if (!item.sessionRef) return null;
	return { sessionRef: item.sessionRef, title: item.title };
}

export function writeSessionDragData(dataTransfer: DataTransfer, item: SessionItem): boolean {
	const payload = sessionDragDataFromItem(item);
	if (!payload) return false;
	dataTransfer.setData(FRAYM_SESSION_DRAG_TYPE, JSON.stringify(payload));
	dataTransfer.setData("text/plain", item.title);
	dataTransfer.effectAllowed = "copyMove";
	return true;
}

export function hasSessionDragData(dataTransfer: DataTransfer): boolean {
	return Array.from(dataTransfer.types).includes(FRAYM_SESSION_DRAG_TYPE);
}

export function readSessionDragData(dataTransfer: DataTransfer): SessionDragData | null {
	const raw = dataTransfer.getData(FRAYM_SESSION_DRAG_TYPE);
	if (!raw) return null;
	try {
		const parsed = JSON.parse(raw) as Partial<SessionDragData>;
		if (!parsed.sessionRef?.workspaceId || !parsed.sessionRef.sessionId) return null;
		return { sessionRef: parsed.sessionRef, title: parsed.title || parsed.sessionRef.sessionId };
	} catch {
		return null;
	}
}

export function dispatchSessionPointerDrag(type: string, detail?: SessionPointerDragDetail): void {
	window.dispatchEvent(new CustomEvent(type, { detail }));
}
