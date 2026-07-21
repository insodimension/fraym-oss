// Browser tool fixtures — demo data for the kitchen-sink `browser` entry.
//
// Lives in @fraym-ai/fixtures (the canonical home for tool fixture data; the
// kitchen-sink `src/fixtures/` dir is a trap — see SKILL G10). The entry imports
// these via `@fraym-ai/fixtures`; the Demo-Dock conversation is `browser-demo.ts`
// (which reuses `SCREENSHOT_B64` from here).
//
// Browser has two output shapes by action: `run` (JS code + text output + inline
// screenshot/figure image blocks) and `open`/`close` (a status line).

/** Per-variation tool input (`call.input`). Keys are the entry's variations. */
export const INPUT = {
	open: { action: "open", name: "main", url: "https://example.com" },
	run: {
		action: "run",
		name: "main",
		code: "const obs = await tab.observe();\ndisplay(obs.elements.length + ' elements');\nreturn obs.title;",
	},
	capture: {
		action: "run",
		name: "main",
		code: "await tab.goto('https://example.com');\nawait tab.screenshot();",
	},
	close: { action: "close", all: true },
};

export const OPEN_OUTPUT = 'Opened tab "main" on headless Chromium\nURL: https://example.com/\nTitle: Example Domain';
export const RUN_OUTPUT = '12 elements\n"Example Domain"';
export const CLOSE_OUTPUT = "Closed 2 tab(s)";
export const CAPTURE_CAPTION = "📸 saved screenshot-2026-06-06.svg (360×220 · 6.2 KB)";
export const ERROR_OUTPUT = 'Error: tab "main" navigation timed out after 30000ms';
export const TRUNCATED_OUTPUT = `${Array.from(
	{ length: 40 },
	(_, i) => `[${i + 1}] <div class="item">row ${i + 1}</div>`,
).join("\n")}

[Showing last 200 of 4000 lines. Full output at artifact://browser-dom-9f2a]`;

// A tiny inline SVG "page screenshot". A live run carries a resized PNG the same way
// (an inline `{ type: "image", data, mimeType }` block in `content[]`).
export const SCREENSHOT_B64 =
	"PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPSczNjAnIGhlaWdodD0nMjIwJyB2aWV3Qm94PScwIDAgMzYwIDIyMCc+PHJlY3Qgd2lkdGg9JzM2MCcgaGVpZ2h0PScyMjAnIHJ4PSc4JyBmaWxsPScjMGIxMDIwJy8+PHJlY3QgeD0nMCcgeT0nMCcgd2lkdGg9JzM2MCcgaGVpZ2h0PSczMCcgcng9JzgnIGZpbGw9JyMxYjIzMzYnLz48Y2lyY2xlIGN4PScxOCcgY3k9JzE1JyByPSc0JyBmaWxsPScjZmY1ZjU2Jy8+PGNpcmNsZSBjeD0nMzQnIGN5PScxNScgcj0nNCcgZmlsbD0nI2ZmYmQyZScvPjxjaXJjbGUgY3g9JzUwJyBjeT0nMTUnIHI9JzQnIGZpbGw9JyMyN2M5M2YnLz48cmVjdCB4PSc3NCcgeT0nOCcgd2lkdGg9JzI1MCcgaGVpZ2h0PScxNCcgcng9JzcnIGZpbGw9JyMwYjEwMjAnLz48dGV4dCB4PSc4NicgeT0nMTknIGZvbnQtZmFtaWx5PSdtb25vc3BhY2UnIGZvbnQtc2l6ZT0nMTAnIGZpbGw9JyM3ZDhhYTgnPmV4YW1wbGUuY29tPC90ZXh0Pjx0ZXh0IHg9JzIwJyB5PSc3MCcgZm9udC1mYW1pbHk9J3NhbnMtc2VyaWYnIGZvbnQtc2l6ZT0nMjAnIGZvbnQtd2VpZ2h0PSc3MDAnIGZpbGw9JyNlNmViZjUnPkV4YW1wbGUgRG9tYWluPC90ZXh0PjxyZWN0IHg9JzIwJyB5PSc5MCcgd2lkdGg9JzMwMCcgaGVpZ2h0PSc4JyByeD0nNCcgZmlsbD0nIzMzNDA1ZScvPjxyZWN0IHg9JzIwJyB5PScxMDYnIHdpZHRoPScyNjAnIGhlaWdodD0nOCcgcng9JzQnIGZpbGw9JyMyYTM1NTAnLz48cmVjdCB4PScyMCcgeT0nMTIyJyB3aWR0aD0nMjgwJyBoZWlnaHQ9JzgnIHJ4PSc0JyBmaWxsPScjMmEzNTUwJy8+PHJlY3QgeD0nMjAnIHk9JzE1MCcgd2lkdGg9JzExMCcgaGVpZ2h0PScyNicgcng9JzYnIGZpbGw9JyMzYjgyZjYnLz48dGV4dCB4PSc0MCcgeT0nMTY4JyBmb250LWZhbWlseT0nc2Fucy1zZXJpZicgZm9udC1zaXplPScxMScgZmlsbD0nI2ZmZmZmZic+TW9yZSBpbmZvIOKGkjwvdGV4dD48L3N2Zz4=";

/** Per-variation result `details` (`call.output.details`). `truncated` carries `meta.truncation`. */
export const DETAILS = {
	open: { action: "open", name: "main", browser: "headless", url: "https://example.com/" },
	run: { action: "run", name: "main", browser: "headless", url: "https://example.com/" },
	capture: {
		action: "run",
		name: "main",
		browser: "headless",
		url: "https://example.com/",
		screenshots: [
			{ dest: "screenshot-2026-06-06.svg", mimeType: "image/svg+xml", bytes: 6200, width: 360, height: 220 },
		],
	},
	close: { action: "close", name: "main" },
	truncated: {
		action: "run",
		name: "main",
		browser: "headless",
		url: "https://example.com/",
		meta: { truncation: { artifactId: "browser-dom-9f2a" } },
	},
};
