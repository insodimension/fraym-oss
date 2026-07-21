import type { SessionDriver, SessionRef, ToolDescriptor } from "@fraym-ai/driver";
import { useEffect, useState } from "react";

export interface ToolsState {
	readonly tools: readonly ToolDescriptor[] | null;
	readonly loading: boolean;
}

/**
 * Fetch the live tools visible to the agent on demand (parity with Engine
 * `/tools`). Mirrors {@link useContextBreakdown}: the list is pulled when a
 * consumer asks for it (a `/tools` result block mounts), not pushed on every
 * event. Returns `null` until the first fetch resolves, or when the driver
 * lacks the capability (e.g. a transport that doesn't expose `getTools`).
 */
export function useTools(
	driver: SessionDriver | null | undefined,
	sessionRef: SessionRef | null | undefined,
	open: boolean,
): ToolsState {
	const [tools, setTools] = useState<readonly ToolDescriptor[] | null>(null);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (!open || !driver?.getTools || !sessionRef) return;
		const request = createToolsRequest();
		setLoading(true);
		void request.fetch(driver, sessionRef, setTools, setLoading);
		return () => {
			request.cancel();
		};
	}, [open, driver, sessionRef]);

	return { tools, loading };
}

function createToolsRequest() {
	let cancelled = false;

	return {
		cancel: () => {
			cancelled = true;
		},
		fetch: async (
			driver: SessionDriver,
			sessionRef: SessionRef,
			setTools: (tools: readonly ToolDescriptor[] | null) => void,
			setLoading: (loading: boolean) => void,
		) => {
			try {
				const result = await driver.getTools?.(sessionRef);
				if (!cancelled) setTools(result ?? null);
			} catch {
				if (!cancelled) setTools(null);
			} finally {
				if (!cancelled) setLoading(false);
			}
		},
	};
}
