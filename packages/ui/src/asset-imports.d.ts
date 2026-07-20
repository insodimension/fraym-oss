// Bundler asset imports used by fraym-ui. The consuming bundler (Vite) turns a
// `?url` import into an emitted asset URL string. Declared with the exact
// specifier (not a `*?url` wildcard) so it never collides with `vite/client`.
declare module "pdfjs-dist/build/pdf.worker.min.mjs?url" {
	const src: string;
	export default src;
}
