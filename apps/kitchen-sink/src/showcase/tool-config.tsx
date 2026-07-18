import { createContext, type ReactNode, useContext, useMemo } from "react";
import { type ControlsSchema, useControls } from "./controls";

// Generic, per-entry tool configuration — the catalog backbone. An entry declares
// its own `config` schema (its axes + modes); the shell owns the live values and
// the rendered Configuration panel, and shares both with:
//   • the entry's preview Component (reads `values`)
//   • the shared Demo Dock (reads e.g. `values.mode`)
// so the dock reflects the tool's own config instead of carrying tool knobs itself.

interface ToolConfigValue {
	/** All config values (preview + display) — used by the isolated preview card. */
	readonly values: Record<string, unknown>;
	/** Only the `scope: "display"` values — cross-cutting prefs shared with the Demo Dock. */
	readonly displayValues: Record<string, unknown>;
	readonly panel: ReactNode;
}

const ToolConfigContext = createContext<ToolConfigValue>({ values: {}, displayValues: {}, panel: null });

export function useToolConfig(): ToolConfigValue {
	return useContext(ToolConfigContext);
}

/**
 * Owns the live config values for one entry's declared schema and provides them
 * (plus the generic Configuration panel) to everything below — the entry preview
 * and the Demo Dock. Key this by entry id so values reset per entry.
 */
export function ToolConfigProvider({ schema, children }: { schema?: ControlsSchema; children: ReactNode }) {
	const hasSchema = !!schema && Object.keys(schema).length > 0;
	const { values, panel } = useControls(schema ?? {});
	const displayValues = useMemo(() => {
		const out: Record<string, unknown> = {};
		if (schema) {
			for (const key of Object.keys(schema)) {
				if (schema[key]?.scope === "display") out[key] = (values as Record<string, unknown>)[key];
			}
		}
		return out;
	}, [schema, values]);
	const context = useMemo(() => ({
		values: values as Record<string, unknown>,
		displayValues,
		panel: hasSchema ? panel : null,
	}), [displayValues, hasSchema, panel, values]);
	return (
		<ToolConfigContext.Provider value={context}>
			{children}
		</ToolConfigContext.Provider>
	);
}

