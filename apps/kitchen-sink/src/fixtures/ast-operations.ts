const BAR = "\u2502"; // │
const f = (name: string, hash: string, count: number): string =>
	`## ${name}#${hash} (${count} ${count === 1 ? "replacement" : "replacements"})`;
const del = (n: number, text: string): string => `-${n}${BAR}${text}`;
const add = (n: number, text: string): string => `+${n}${BAR}${text}`;
const m = (n: number, text: string): string => `*${n}${BAR}${text}`;
const c = (n: number, text: string): string => ` ${n}${BAR}${text}`;
const meta = (s: string): string => `  meta: ${s}`;

export const AST_EDIT_MULTI = [
	"# src/hooks/",
	f("use-thread.ts", "a4b2", 2),
	del(40, 'console.log("thread mounted", id);'),
	add(40, 'logger.info("thread mounted", id);'),
	del(58, 'console.log("thread closed");'),
	add(58, 'logger.info("thread closed");'),
	f("use-composer.ts", "12c7", 1),
	del(22, 'console.log("composer ready");'),
	add(22, 'logger.info("composer ready");'),
	"",
	"# src/features/thread/",
	f("thread.tsx", "1c71", 1),
	del(210, 'console.log("render", tools.length);'),
	add(210, 'logger.info("render", tools.length);'),
].join("\n");

export const AST_EDIT_SINGLE = [
	del(8, "export function clamp(n, lo, hi) {"),
	add(8, "export function clamp(n: number, lo: number, hi: number): number {"),
].join("\n");

export const AST_EDIT_BROAD = Array.from({ length: 6 }, (_, i) => [
	`# packages/pkg-${i + 1}/`,
	f("index.ts", (0x3000 + i).toString(16), 1),
	del((i + 1) * 7, `export const VERSION = "${i + 1}.0.0";`),
	add((i + 1) * 7, `export const VERSION = "${i + 1}.1.0";`),
])
	.flat()
	.join("\n");

export const AST_GREP_CAPTURES = [
	"# src/hooks/",
	"## use-thread.ts#a4b2",
	m(40, "const [open, setOpen] = useState(false);"),
	meta("$NAME=open, $INIT=false"),
	m(52, "const [count, setCount] = useState(0);"),
	meta("$NAME=count, $INIT=0"),
	"## use-composer.ts#12c7",
	m(18, 'const [text, setText] = useState("");'),
	meta('$NAME=text, $INIT=""'),
	"",
	"# src/features/thread/",
	"## thread.tsx#1c71",
	m(210, "const [hovered, setHovered] = useState<string | null>(null);"),
	meta("$NAME=hovered, $INIT=null"),
].join("\n");

export const AST_GREP_NODE = [
	"# src/lib/clamp.ts#9f2a",
	m(8, "export function clamp(n: number, lo: number, hi: number) {"),
	c(9, "  return Math.max(lo, Math.min(hi, n));"),
	c(10, "}"),
	meta("$NAME=clamp"),
].join("\n");

export const AST_GREP_BROAD = Array.from({ length: 6 }, (_, i) => [
	`# packages/pkg-${i + 1}/`,
	`## index.ts#${(0x2000 + i).toString(16)}`,
	m((i + 1) * 9, `console.log("pkg-${i + 1} ready", ${i});`),
	meta(`$$$ARGS="pkg-${i + 1} ready", ${i}`),
])
	.flat()
	.join("\n");

