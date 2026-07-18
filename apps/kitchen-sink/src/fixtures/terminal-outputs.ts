const G = "\u001b[32m"; // green
const R = "\u001b[31m"; // red
const D = "\u001b[2m"; //  dim
const B = "\u001b[1m"; //  bold
const X = "\u001b[0m"; //  reset

const PASS = (name: string, ms: string) => `${G}✓${X} ${name} ${D}[${ms}]${X}`;

export const BUILD_OUTPUT = [
	"  vite v6.0.1 building for production...",
	`  ${G}✓${X} 412 modules transformed.`,
	`  dist/index.html                  ${D}0.61 kB │ gzip:  0.34 kB${X}`,
	`  dist/assets/index-4f2a.css      ${D}18.20 kB │ gzip:  4.11 kB${X}`,
	`  dist/assets/index-9c1d.js      ${D}214.77 kB │ gzip: 68.05 kB${X}`,
	`  ${G}✓ built in 1.82s${X}`,
].join("\n");

export const TEST_OUTPUT = [
	`${B}bun test v1.2.0${X}`,
	"",
	`${D}src/telemetry.test.ts:${X}`,
	PASS("batches events under the flush threshold", "2.1ms"),
	PASS("flushes on the 50th event", "1.4ms"),
	PASS("flushes after the 5s timer", "5.0ms"),
	PASS("drops events when the buffer overflows", "0.9ms"),
	PASS("redacts pii fields before send", "1.8ms"),
	`${D}src/transport.test.ts:${X}`,
	PASS("retries failed posts with backoff", "12.3ms"),
	PASS("gives up after 5 attempts", "3.1ms"),
	PASS("serializes the batch envelope", "0.7ms"),
	`${D}src/bootstrap.test.ts:${X}`,
	PASS("wires the default sink", "1.0ms"),
	PASS("honors TELEMETRY_DISABLED", "0.6ms"),
	`${D}src/redact.test.ts:${X}`,
	PASS("masks email + token fields", "0.8ms"),
	PASS("leaves safe fields intact", "0.5ms"),
	"",
	`${G} 28 pass${X}`,
	" 0 fail",
	" 64 expect() calls",
	`Ran 28 tests across 4 files. ${D}[148.00ms]${X}`,
].join("\n");

export const TYPECHECK_OK = ["tsc --noEmit", `${G}No type errors.${X}`].join("\n");

export const TYPECHECK_ERROR = [
	`src/bootstrap.ts(14,22): ${R}error TS2304${X}: Cannot find name 'sessionId'.`,
	`src/bootstrap.ts(20,9): ${R}error TS2554${X}: Expected 2 arguments, but got 1.`,
	`${R}Found 2 errors in 1 file.${X}`,
].join("\n");

export const DEV_OUTPUT = [
	`${D}[native]${X} engine WS listening on ws://runtime.fraym.test:5195`,
	`${D}[web]${X} Fraym Web on http://app.fraym.test:5185`,
	`${D}[native]${X} watching for changes…`,
].join("\n");

export const TRUNCATED_OUTPUT = `${Array.from({ length: 40 }, (_, i) => `[${String(i + 1).padStart(3, "0")}] migrate: applied ${(i + 1) * 7} rows to events_${i + 1}`).join("\n")}

[Showing last 200 of 5000 lines. Full output at artifact://mig-9f2a]`;
