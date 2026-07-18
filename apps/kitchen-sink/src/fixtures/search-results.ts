const BAR = "\u2502"; // │
const m = (n: number, text: string): string => `*${n}${BAR}${text}`;
const c = (n: number, text: string): string => ` ${n}${BAR}${text}`;
const GAP = `   ${BAR}...`;

export const MULTI_FILE = [
	"# src/hooks/",
	"## session-tools.ts#a4b2",
	m(18, "export function useToolStream(workspace: WorkspaceRef): ToolStreamState {"),
	c(19, "\tconst [state, dispatch] = useReducer(toolReducer, EMPTY);"),
	GAP,
	m(54, "\treturn { calls: state.calls, dispatch };"),
	"## session-types.ts#12c7",
	m(7, "export interface ToolStreamState {"),
	"",
	"# src/features/thread/",
	"## thread.tsx#1c71",
	m(210, "\tconst tools = useToolStream(workspace);"),
	c(211, "\tconst transcript = useTranscript(tools);"),
].join("\n");

export const SINGLE_FILE = [
	m(42, "if (user.id) {"),
	c(43, "\treturn user;"),
	c(44, "}"),
	GAP,
	m(118, "const id = user.id ?? fallbackId;"),
].join("\n");

export const ROOT_FILES = [
	"# package.json",
	m(2, '\t"name": "@fraym/ui",'),
	"",
	"# tsconfig.json",
	m(9, '\t"types": ["./src/index.ts"],'),
].join("\n");

export const CONTENT = {
	multiFile: { display: MULTI_FILE, matchCount: 5, fileCount: 3, scopePath: "packages/ui/src" },
	singleFile: { display: SINGLE_FILE, matchCount: 2, fileCount: 1, scopePath: undefined },
	rootFiles: { display: ROOT_FILES, matchCount: 2, fileCount: 2, scopePath: undefined },
} satisfies Record<string, { display: string; matchCount: number; fileCount: number; scopePath?: string }>;

export const INPUT = {
	multiFile: { pattern: "useToolStream", paths: ["packages/ui/src"] },
	singleFile: { pattern: "user\\.id", paths: ["packages/ui/src/hooks/session-tools.ts"] },
	rootFiles: { pattern: '"name"|"types"', paths: ["."], gitignore: false },
} satisfies Record<string, Record<string, unknown>>;
