import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { devServerWatch, devVitePlugins } from "../../scripts/vite-dev-hardening";

export default defineConfig({
	plugins: [...devVitePlugins(), react(), tailwindcss()],
	server: {
		port: 5186,
		strictPort: true,
		watch: devServerWatch(),
		fs: { strict: false },
	},
});
