// Calc tool fixtures — simple expression evaluation output.
// Used by the kitchen-sink calc entry to build synthetic ActiveToolCalls.
//
// Calc takes `{ expression: string }` and returns
// `{ content: [{ type: "text", text: "<expression> = <result>" }], details: undefined }`.

export type CalcVariation = "simple" | "complex" | "string" | "error" | "pending";

// ─── Simple arithmetic ─────────────────────────────────────────────────────
const SIMPLE_OUTPUT = "2 + 2 = 4";

// ─── Complex expression ─────────────────────────────────────────────────────
const COMPLEX_INPUT = { expression: "Math.sqrt(144) / 3" };
const COMPLEX_OUTPUT = "Math.sqrt(144) / 3 = 4";

// ─── String concatenation ───────────────────────────────────────────────────
const STRING_INPUT = { expression: '"hello" + " world"' };
const STRING_OUTPUT = '"hello" + " world" = hello world';

// ─── Error ──────────────────────────────────────────────────────────────────
const ERROR_INPUT = { expression: "JSON.parse([1,2,3])" };
const ERROR_OUTPUT = "Error: Unexpected token ','";

// ─── Pending ────────────────────────────────────────────────────────────────
const PENDING_INPUT = { expression: "42 * 2" };

// ─── Output text by variation ───────────────────────────────────────────────
export const CALC_OUTPUT: Record<CalcVariation, string | undefined> = {
	simple: SIMPLE_OUTPUT,
	complex: COMPLEX_OUTPUT,
	string: STRING_OUTPUT,
	error: ERROR_OUTPUT,
	pending: undefined,
};

// ─── Inputs by variation ────────────────────────────────────────────────────
export const CALC_INPUT: Record<CalcVariation, Record<string, unknown>> = {
	simple: { expression: "2 + 2" },
	complex: COMPLEX_INPUT,
	string: STRING_INPUT,
	error: ERROR_INPUT,
	pending: PENDING_INPUT,
};
