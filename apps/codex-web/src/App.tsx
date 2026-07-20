import { CODEX_WORKSPACE, createCodexSessionDriver } from "@fraym/driver-codex";
import { FraymHost } from "@fraym/host";
import { useMemo } from "react";

const bridgeUrl = import.meta.env.VITE_CODEX_BRIDGE_URL ?? "http://localhost:4319";

export function App() {
	const driver = useMemo(() => createCodexSessionDriver({ bridgeUrl }), []);

	return (
		<FraymHost
			drivers={{ session: driver }}
			workspace={CODEX_WORKSPACE}
			storageKey="fraym-codex-active-session"
			productLabel="Fraym"
			version="codex-web"
			planLabel="Codex CLI"
			userName="Codex"
			userEmail="local bridge · exec --json"
			enabledModes={["code"]}
			dockTabs={["insights"]}
		/>
	);
}
