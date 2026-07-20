import { useMemo } from "react";
import { useLiveContextPercent } from "../../hooks/use-live-context-percent";
import { useSession } from "../../hooks/use-session";
import type { FraymSurfaceConfig } from "../surface-kit";
import { StatusBar, type StatusSegment } from "./status-bar";

export interface ConnectedStatusBarProps {
	readonly settings?: FraymSurfaceConfig;
	readonly className?: string;
}

type SessionState = ReturnType<typeof useSession>;

export function ConnectedStatusBar({ settings, className }: ConnectedStatusBarProps) {
	const session = useSession();
	const contextPercent = useLiveContextPercent(session) ?? null;
	const segments = useMemo(() => buildStatusSegments(session, contextPercent), [session, contextPercent]);

	return <StatusBar segments={segments} settings={settings} className={className} />;
}

function buildStatusSegments(session: SessionState, contextPercent: number | null): StatusSegment[] {
	return [
		sessionSegment(session),
		modelSegment(session),
		contextSegment(contextPercent),
		toolsSegment(session),
		planSegment(session),
		goalSegment(session),
	];
}

function sessionSegment(session: SessionState): StatusSegment {
	return {
		id: "session",
		label: sessionLabel(session),
		value: session.status,
		icon: "branch",
		tone: sessionTone(session.status),
		active: session.status === "running",
	};
}

function sessionLabel(session: SessionState): string {
	return session.snapshot?.workspace.displayName ?? session.snapshot?.workspace.path ?? "workspace";
}

function sessionTone(status: SessionState["status"]): StatusSegment["tone"] {
	if (status === "failed") return "del";
	if (status === "running") return "accent";
	return "default";
}

function modelSegment(session: SessionState): StatusSegment {
	return {
		id: "model",
		label: modelLabel(session),
		value: modelValue(session),
		icon: "spark",
		hidden: modelHidden(session),
	};
}

function modelLabel(session: SessionState): string {
	return session.snapshot?.config?.modelId ?? "model";
}

function modelValue(session: SessionState): string | undefined {
	return session.thinkingLevel ?? session.snapshot?.config?.thinkingLevel;
}

function modelHidden(session: SessionState): boolean {
	return !session.snapshot?.config?.modelId && !session.thinkingLevel;
}

function contextSegment(contextPercent: number | null): StatusSegment {
	return {
		id: "context",
		label: "Context",
		value: contextPercent != null ? `${contextPercent}%` : undefined,
		icon: "panel",
		tone: contextTone(contextPercent),
		hidden: contextPercent == null,
	};
}

function contextTone(contextPercent: number | null): StatusSegment["tone"] {
	if (contextPercent == null) return "accent";
	if (contextPercent >= 85) return "del";
	if (contextPercent >= 65) return "warn";
	return "accent";
}

function toolsSegment(session: SessionState): StatusSegment {
	return {
		id: "tools",
		label: "Tools",
		value: session.activeTools.length ? String(session.activeTools.length) : undefined,
		icon: "termBox",
		tone: "blue",
		active: session.activeTools.length > 0,
	};
}

function planSegment(session: SessionState): StatusSegment {
	return {
		id: "plan",
		label: "Plan",
		value: session.planMode?.workflow,
		icon: "list",
		tone: "accent",
		active: session.planMode?.enabled,
		hidden: !session.planMode?.enabled,
	};
}

function goalSegment(session: SessionState): StatusSegment {
	return {
		id: "goal",
		label: "Goal",
		value: session.goal?.status,
		icon: "pin",
		tone: "add",
		active: !!session.goal,
		hidden: !session.goal,
	};
}
