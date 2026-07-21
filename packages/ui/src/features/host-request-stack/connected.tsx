import type { HostUiRequest as DriverHostUiRequest } from "@fraym-ai/driver";
import { useMemo } from "react";
import { useSession } from "../../hooks/use-session";
import type { FraymSurfaceConfig } from "../surface-kit";
import { HostRequestStack, type HostUiRequest } from "./host-request-stack";

type PermissionHostRequest = Extract<DriverHostUiRequest, { readonly kind: "permission" }>;
type ConfirmHostRequest = Extract<DriverHostUiRequest, { readonly kind: "confirm" }>;
type NotifyHostRequest = Extract<DriverHostUiRequest, { readonly kind: "notify" }>;
type SessionState = ReturnType<typeof useSession>;
type HostUiResponse = Parameters<SessionState["respondToHostUiRequest"]>[0];

// Host UI kinds that the inline approval stack does NOT render. status/widget/
// title/editorText are engine UI directives (setWidget/setStatus/...), `reset`
// clears editor state, and `notify` already surfaces as a notice banner —
// rendering them as "approval" cards with a Cancel button is wrong (and pollutes
// the thread after every turn). `select` is the rich `ask` picker: it routes to
// the modal `HostUiDialog` (via `ConnectedSelectDialog`) instead — the inline
// fallback here can only show a title + lone Cancel, dropping the options.
const NON_APPROVAL_HOST_KINDS: ReadonlySet<string> = new Set([
	"status",
	"widget",
	"title",
	"editorText",
	"reset",
	"notify",
	"select",
]);

function mapDriverHostRequest(request: DriverHostUiRequest): HostUiRequest {
	if (request.kind === "permission") return permissionHostRequest(request);
	if (request.kind === "confirm") return confirmHostRequest(request);
	if (request.kind === "notify") return notifyHostRequest(request);
	return fallbackHostRequest(request);
}

function permissionHostRequest(request: PermissionHostRequest): HostUiRequest {
	return {
		id: request.requestId,
		title: request.title,
		description: `${request.toolName} wants permission to continue.`,
		detail: permissionDetail(request),
		tone: "warn",
		icon: "shield",
		actions: request.options.map(permissionAction),
	};
}

function permissionDetail(request: PermissionHostRequest): string | undefined {
	return request.paths?.join(", ") ?? request.locations?.map(location => location.path).join(", ");
}

function permissionAction(option: PermissionHostRequest["options"][number]) {
	return {
		id: `option:${option.optionId}`,
		label: option.name,
		variant: "outline" as const,
	};
}

function confirmHostRequest(request: ConfirmHostRequest): HostUiRequest {
	return {
		id: request.requestId,
		title: request.title,
		description: request.message,
		tone: "warn",
		icon: "hand",
		actions: [
			{ id: "confirm:true", label: "Confirm", variant: "default" },
			{ id: "confirm:false", label: "Cancel", variant: "outline" },
		],
	};
}

function notifyHostRequest(request: NotifyHostRequest): HostUiRequest {
	return {
		id: request.requestId,
		title: request.level ?? "notice",
		description: request.message,
		tone: notifyTone(request),
		icon: "shield",
		actions: [{ id: "cancel", label: "Dismiss", variant: "outline" }],
	};
}

function notifyTone(request: NotifyHostRequest): HostUiRequest["tone"] {
	if (request.level === "error") return "del";
	if (request.level === "warning") return "warn";
	return "blue";
}

function fallbackHostRequest(request: DriverHostUiRequest): HostUiRequest {
	return {
		id: request.requestId,
		title: fallbackTitle(request),
		description: fallbackDescription(request),
		tone: "accent",
		icon: "panel",
		actions: [{ id: "cancel", label: "Cancel", variant: "outline" }],
	};
}

function fallbackTitle(request: DriverHostUiRequest): string {
	if ("title" in request) return request.title;
	return request.kind;
}

function fallbackDescription(request: DriverHostUiRequest): string | undefined {
	if ("placeholder" in request) return request.placeholder;
	if ("text" in request) return request.text;
	if ("key" in request) return request.key;
	return undefined;
}

export interface ConnectedHostRequestStackProps {
	readonly settings?: FraymSurfaceConfig;
	readonly className?: string;
}

export function ConnectedHostRequestStack({ settings, className }: ConnectedHostRequestStackProps) {
	const session = useSession();
	const requests = useMemo(
		() =>
			session.hostUiRequests.filter(request => !NON_APPROVAL_HOST_KINDS.has(request.kind)).map(mapDriverHostRequest),
		[session.hostUiRequests],
	);
	const handleAction = (requestId: string, actionId: string) => {
		if (!hostRequestExists(session, requestId)) return;
		void session.respondToHostUiRequest(hostUiResponse(requestId, actionId));
	};

	return <HostRequestStack requests={requests} settings={settings} onAction={handleAction} className={className} />;
}

function hostRequestExists(session: SessionState, requestId: string) {
	return session.hostUiRequests.some(item => item.requestId === requestId);
}

function hostUiResponse(requestId: string, actionId: string): HostUiResponse {
	if (actionId.startsWith("option:")) return { requestId, optionId: actionId.slice("option:".length) };
	if (actionId === "confirm:true") return { requestId, confirmed: true };
	if (actionId === "confirm:false") return { requestId, confirmed: false };
	return { requestId, cancelled: true };
}
