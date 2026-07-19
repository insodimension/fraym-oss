import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  esbuild: {
    target: "es2023",
  },
  build: {
    target: "es2023",
  },
  optimizeDeps: {
    // The Fraym UI PdfView imports pdfjs-dist's worker as a Vite `?url` asset.
    // Vite's dev dependency optimizer (esbuild) can't emit a `?url` asset URL,
    // so pre-bundling any dependency that pulls in pdfjs-dist crashes on start.
    // Excluding only pdfjs-dist keeps the rest of the graph pre-bundled and
    // leaves production `vite build` (which emits the worker asset) untouched.
    exclude: ["pdfjs-dist"],
  },
  plugins: [react(), tailwindcss()],
});
