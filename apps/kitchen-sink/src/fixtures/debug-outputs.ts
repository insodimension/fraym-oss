// Debug tool fixtures — realistic output for each action family.
// Used by the kitchen-sink debug entry to build synthetic ActiveToolCalls.

// ─── Launch ────────────────────────────────────────────────────────────────

export const LAUNCH_OUTPUT = [
	"Session 7a3f",
	"Adapter: debugpy",
	"Status: running",
	"CWD: /workspace/fraym",
	"Program: /workspace/fraym/src/main.py",
	"Location: /workspace/fraym/src/main.py:42",
].join("\n");

// ─── Set breakpoint ────────────────────────────────────────────────────────

export const BREAKPOINT_OUTPUT = [
	"Breakpoints for /workspace/fraym/src/main.py:",
	"- line 42: verified",
	"- line 88: pending if x > 0",
	"- line 104: verified (condition: i % 2 === 0)",
].join("\n");

// ─── Stack trace ───────────────────────────────────────────────────────────

export const STACK_OUTPUT = [
	"#0  main (main.py:42)",
	"#1  process_data (utils.py:215)",
	"#2  handle_request (server.py:88)",
	"#3  <module> (main.py:1)",
].join("\n");

// ─── Threads ───────────────────────────────────────────────────────────────

export const THREADS_OUTPUT = [
	"* thread 1 (id=0x1a2b): running   main.py:42",
	"  thread 2 (id=0x3c4d): sleeping  worker.py:18",
	"  thread 3 (id=0x5e6f): sleeping  worker.py:34",
].join("\n");

// ─── Scopes ────────────────────────────────────────────────────────────────

export const SCOPES_OUTPUT = [
	"scope: Locals",
	"  variablesReference: 1001",
	"  named: 8",
	"  indexed: 0",
	"scope: Globals",
	"  variablesReference: 1002",
	"  expensive: true",
].join("\n");

// ─── Variables ─────────────────────────────────────────────────────────────

export const VARIABLES_OUTPUT = [
	"x = 42 (int)",
	'name = "Alice" (str)',
	"items = [1, 2, 3] (list, len=3)",
	"config = {…} (dict, 5 entries)",
	"result = None (NoneType)",
].join("\n");

// ─── Evaluate ──────────────────────────────────────────────────────────────

export const EVALUATION_OUTPUT = ["Result: 42", "Type: int"].join("\n");

// ─── Continue / Step outcomes ──────────────────────────────────────────────

export const CONTINUE_OUTPUT = [
	"Session 7a3f",
	"Adapter: debugpy",
	"Status: running",
	"CWD: /workspace/fraym",
	"Program: /workspace/fraym/src/main.py",
	"Location: /workspace/fraym/src/main.py:88",
	"Continue stopped at /workspace/fraym/src/main.py:88.",
].join("\n");

export const STEP_OUTPUT = [
	"Session 7a3f",
	"Adapter: debugpy",
	"Status: running",
	"CWD: /workspace/fraym",
	"Program: /workspace/fraym/src/main.py",
	"Frame: process_data",
	"Location: /workspace/fraym/utils.py:215",
	"Step over stopped at /workspace/fraym/utils.py:215.",
].join("\n");

// ─── Sessions list ─────────────────────────────────────────────────────────

export const SESSIONS_OUTPUT = [
	"7a3f: running",
	"  adapter=debugpy",
	"  cwd=/workspace/fraym",
	"  program=/workspace/fraym/src/main.py",
	"  location=/workspace/fraym/src/main.py:42",
].join("\n");

// ─── Error ─────────────────────────────────────────────────────────────────

export const ERROR_OUTPUT = "Error: No debug session active. Launch or attach first.";

// ─── Inputs ────────────────────────────────────────────────────────────────

export const INPUT: Record<string, Record<string, unknown>> = {
	launch: { action: "launch", program: "src/main.py", adapter: "debugpy" },
	breakpoint: { action: "set_breakpoint", file: "src/main.py", line: 42 },
	stack: { action: "stack_trace" },
	threads: { action: "threads" },
	scopes: { action: "scopes", frame_id: 1 },
	variables: { action: "variables", variable_ref: 1001 },
	evaluate: { action: "evaluate", expression: "2 * 21", context: "repl" },
	continue: { action: "continue" },
	step: { action: "step_over" },
	sessions: { action: "sessions" },
	error: { action: "stack_trace" },
};

