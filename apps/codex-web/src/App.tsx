import { createCodexDriver } from "@fraym/driver-codex";
import { SessionThread, type SessionThreadProps } from "@fraym/ui";
import { useMemo } from "react";

const bridgeUrl = import.meta.env.VITE_CODEX_BRIDGE_URL ?? "http://localhost:4319";

export function App() {
	const driver = useMemo(() => createCodexDriver({ bridgeUrl }), []);
	const sessionProps: SessionThreadProps = {
		source: driver,
		title: "Codex CLI",
		model: "codex",
		contextUsage: 0,
		onApprovalResponse: driver.respondToApproval,
		onStop: driver.cancel,
		onSubmit: (value) => {
			void driver.prompt(value).catch(() => undefined);
		},
	};

	return (
		<main className="h-full bg-fr-bg text-fr-text">
			<header className="flex h-12 items-center border-b border-fr-border-soft px-4 font-secondary text-fr-sm">
				<span className="font-medium">Fraym</span>
				<span className="mx-2 text-fr-text-3">×</span>
				<span className="text-fr-text-2">Codex CLI</span>
				<span className="ml-auto text-fr-text-3">Local bridge · exec --json</span>
			</header>
			<section className="h-[calc(100%-3rem)]">
				<SessionThread {...sessionProps} />
			</section>
		</main>
	);
}
