// Ask tool fixtures — interactive user prompting output.
// Used by the kitchen-sink ask entry to build synthetic ActiveToolCalls.
//
// Ask takes `{ questions: [{ id, question, options, multi?, recommended? }] }` and
// returns `{ content: [...], details: AskToolDetails }`.

export type AskVariation =
	| "single"
	| "multi-select"
	| "with-description"
	| "multi-part"
	| "custom-input"
	| "error"
	| "pending";

// ─── Input questions ────────────────────────────────────────────────────────

export const SINGLE_INPUT = {
	questions: [
		{
			id: "q1",
			question: "What Rust web framework should I use?",
			options: [
				{ label: "Axum", description: "Tokio ecosystem, ergonomic" },
				{ label: "Actix Web", description: "Battle-tested, high performance" },
				{ label: "Rocket", description: "Batteries-included, async" },
			],
			recommended: 0,
		},
	],
};

export const MULTI_SELECT_INPUT = {
	questions: [
		{
			id: "q1",
			question: "Which features do you want? (select all that apply)",
			options: [
				{ label: "CLI interface" },
				{ label: "REST API" },
				{ label: "WebSocket support" },
				{ label: "Database integration" },
			],
			multi: true,
		},
	],
};

export const WITH_DESCRIPTION_INPUT = {
	questions: [
		{
			id: "q1",
			question: "Choose a deployment target:",
			options: [
				{ label: "Acme Functions", description: "Serverless, pay-per-execution" },
				{ label: "Docker", description: "Containerized, portable" },
				{ label: "Bare metal", description: "Maximum control, fixed cost" },
			],
			// Recommended differs from the selection (Docker) — the history card
			// shows the Recommended badge on an UNSELECTED option here.
			recommended: 0,
		},
	],
};

export const MULTI_PART_INPUT = {
	questions: [
		{
			id: "q1",
			question: "What's your experience level with Rust?",
			options: [{ label: "Beginner" }, { label: "Intermediate" }, { label: "Advanced" }],
		},
		{
			id: "q2",
			question: "What are you building?",
			options: [{ label: "CLI tool" }, { label: "Web service" }, { label: "Game" }, { label: "Embedded system" }],
		},
	],
};

export const CUSTOM_INPUT_INPUT = {
	questions: [
		{
			id: "q1",
			question: "Describe your project requirements:",
			options: [{ label: "Small (< 1K LOC)" }, { label: "Medium (1-10K LOC)" }, { label: "Large (10K+ LOC)" }],
		},
	],
};

export const ERROR_INPUT = {
	questions: [
		{
			id: "q1",
			question: "What error handling strategy?",
			options: [{ label: "Result type" }, { label: "Panic" }, { label: "This error" }],
		},
	],
};

export const PENDING_INPUT = {
	questions: [
		{
			id: "q1",
			question: "Which database should we use?",
			options: [{ label: "PostgreSQL" }, { label: "SQLite" }, { label: "MongoDB" }],
			recommended: 0,
		},
	],
};

// ─── Output details ─────────────────────────────────────────────────────────

export const SINGLE_DETAILS = {
	question: "What Rust web framework should I use?",
	options: ["Axum", "Actix Web", "Rocket"],
	multi: false,
	selectedOptions: ["Axum"],
};

export const MULTI_SELECT_DETAILS = {
	question: "Which features do you want? (select all that apply)",
	options: ["CLI interface", "REST API", "WebSocket support", "Database integration"],
	multi: true,
	selectedOptions: ["CLI interface", "REST API"],
};

export const WITH_DESCRIPTION_DETAILS = {
	question: "Choose a deployment target:",
	options: ["Acme Functions", "Docker", "Bare metal"],
	multi: false,
	selectedOptions: ["Docker"],
};

export const MULTI_PART_DETAILS = {
	results: [
		{
			id: "q1",
			question: "What's your experience level with Rust?",
			options: ["Beginner", "Intermediate", "Advanced"],
			multi: false,
			selectedOptions: ["Intermediate"],
		},
		{
			id: "q2",
			question: "What are you building?",
			options: ["CLI tool", "Web service", "Game", "Embedded system"],
			multi: false,
			selectedOptions: ["Web service"],
		},
	],
};

export const CUSTOM_INPUT_DETAILS = {
	question: "Describe your project requirements:",
	options: ["Small (< 1K LOC)", "Medium (1-10K LOC)", "Large (10K+ LOC)"],
	multi: false,
	selectedOptions: ["Medium (1-10K LOC)"],
	customInput: "Building a real-time chat application with WebSocket support.",
};

export const ERROR_DETAILS = {};

// ─── Aggregated maps ────────────────────────────────────────────────────────

export const ASK_INPUT: Record<AskVariation, Record<string, unknown>> = {
	single: SINGLE_INPUT,
	"multi-select": MULTI_SELECT_INPUT,
	"with-description": WITH_DESCRIPTION_INPUT,
	"multi-part": MULTI_PART_INPUT,
	"custom-input": CUSTOM_INPUT_INPUT,
	error: ERROR_INPUT,
	pending: PENDING_INPUT,
};

export const ASK_DETAILS: Record<AskVariation, Record<string, unknown> | undefined> = {
	single: SINGLE_DETAILS,
	"multi-select": MULTI_SELECT_DETAILS,
	"with-description": WITH_DESCRIPTION_DETAILS,
	"multi-part": MULTI_PART_DETAILS,
	"custom-input": CUSTOM_INPUT_DETAILS,
	error: ERROR_DETAILS,
	pending: undefined,
};

export const ASK_OUTPUT_TEXT: Record<AskVariation, string | undefined> = {
	single: "User selected: Axum",
	"multi-select": "User selected: CLI interface, REST API",
	"with-description": "User selected: Docker",
	"multi-part": "User answered 2 questions",
	"custom-input":
		"User selected: Medium (1-10K LOC)\nUser provided custom input: Building a real-time chat application with WebSocket support.",
	error: "Error: questions must not be empty",
	pending: undefined,
};
