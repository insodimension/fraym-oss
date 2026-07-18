import type { PluginOption } from "vite";

export function devVitePlugins(): PluginOption[] {
	return [];
}

export function devServerWatch() {
	return {
		awaitWriteFinish: {
			stabilityThreshold: 100,
			pollInterval: 20,
		},
	};
}
