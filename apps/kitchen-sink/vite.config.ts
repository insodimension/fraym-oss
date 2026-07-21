import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { devServerWatch, devVitePlugins } from "../../scripts/vite-dev-hardening";

// Kitchen sink — showcase app for @fraym-ai/ui + fraym-vibr. Own port so it
// can run alongside the main web app.
export default defineConfig({
	base: "./",
	plugins: [...devVitePlugins(), react(), tailwindcss()],
	server: {
		port: 5184,
		strictPort: true,
		// The kitchen sink is edited heavily by many lanes; wait for writes to
		// settle so HMR does not read half-written modules.
		watch: devServerWatch(),
	},
});
