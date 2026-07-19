import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createAiSdkDriver } from "@fraym/driver-aisdk";
import { SessionThread, type SessionThreadProps } from "@fraym/ui";
import { useMemo, useState } from "react";

const DEFAULT_BASE_URL = "https://openrouter.ai/api/v1";
const DEFAULT_MODEL = "openai/gpt-4o-mini";

interface Connection {
	readonly baseURL: string;
	readonly apiKey: string;
	readonly model: string;
}

function Session({ connection }: { connection: Connection }) {
	const driver = useMemo(() => {
		const provider = createOpenAICompatible({ name: "byo", baseURL: connection.baseURL, apiKey: connection.apiKey });
		return createAiSdkDriver({ model: provider(connection.model), system: "You are a helpful coding agent." });
	}, [connection]);

	const sessionProps: SessionThreadProps = {
		source: driver,
		title: connection.model,
		model: connection.model,
		contextUsage: 0,
		onStop: driver.cancel,
		onSubmit: (value) => {
			void driver.prompt(value).catch(() => undefined);
		},
	};

	return <SessionThread className="h-full" {...sessionProps} />;
}

export function App() {
	const [baseURL, setBaseURL] = useState(DEFAULT_BASE_URL);
	const [apiKey, setApiKey] = useState("");
	const [model, setModel] = useState(DEFAULT_MODEL);
	const [connection, setConnection] = useState<Connection | null>(null);

	return (
		<main className="h-full bg-fr-bg text-fr-text">
			<header className="flex h-12 items-center border-b border-fr-border-soft px-4 font-secondary text-fr-sm">
				<span className="font-medium">Fraym</span>
				<span className="mx-2 text-fr-text-3">×</span>
				<span className="text-fr-text-2">AI SDK</span>
				<span className="ml-auto text-fr-text-3">Runs fully in the browser</span>
			</header>
			<section className="h-[calc(100%-3rem)]">
				{connection ? (
					<Session connection={connection} />
				) : (
					<form
						className="mx-auto flex h-full max-w-md flex-col justify-center gap-3 px-6"
						onSubmit={(event) => {
							event.preventDefault();
							if (apiKey.trim().length === 0) return;
							setConnection({ baseURL: baseURL.trim(), apiKey: apiKey.trim(), model: model.trim() });
						}}
					>
						<h1 className="font-secondary text-fr-lg font-medium">Connect a model</h1>
						<p className="text-fr-sm text-fr-text-3">
							The whole agent loop runs client-side. Use any CORS-enabled OpenAI-compatible endpoint (OpenRouter, Groq, or a local Ollama / LM Studio). Your key stays in this tab.
						</p>
						<label className="flex flex-col gap-1 text-fr-sm text-fr-text-2">
							Base URL
							<input className="rounded-fr-md border border-fr-border-soft bg-fr-surface px-3 py-2 text-fr-text" value={baseURL} onChange={(event) => setBaseURL(event.target.value)} />
						</label>
						<label className="flex flex-col gap-1 text-fr-sm text-fr-text-2">
							API key
							<input className="rounded-fr-md border border-fr-border-soft bg-fr-surface px-3 py-2 text-fr-text" type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="sk-..." />
						</label>
						<label className="flex flex-col gap-1 text-fr-sm text-fr-text-2">
							Model
							<input className="rounded-fr-md border border-fr-border-soft bg-fr-surface px-3 py-2 text-fr-text" value={model} onChange={(event) => setModel(event.target.value)} />
						</label>
						<button className="mt-2 rounded-fr-md bg-fr-primary px-4 py-2 font-medium text-fr-on-primary" type="submit">
							Start session
						</button>
					</form>
				)}
			</section>
		</main>
	);
}
