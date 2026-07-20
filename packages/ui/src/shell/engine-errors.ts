// Shared "driver not connected" messages for resource and configuration state.

export const ENGINE_RESOURCES_NOT_CONNECTED_ERROR = "Engine resources are not connected.";
export const ENGINE_CONFIG_NOT_CONNECTED_ERROR = "Engine config is not connected.";

export function messageFromError(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}
