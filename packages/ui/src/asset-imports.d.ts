// Bundler asset imports used by fraym-ui. The consuming bundler (Vite) turns a
// `?url` import into an emitted asset URL string. Pulled in via a /// <reference>
// at the top of pdf-view.tsx (the source that owns the import), so composite
// (tsc -b) consumers resolving @fraym-ai/ui through source see this ambient module.
declare module "pdfjs-dist/build/pdf.worker.min.mjs?url" {
	const src: string;
	export default src;
}
