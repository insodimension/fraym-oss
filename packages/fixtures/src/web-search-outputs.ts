// Web search tool fixtures — realistic SearchResponse-shaped output per variation.
// Used by the kitchen-sink web-search entry to build synthetic ActiveToolCalls.
//
// Each OUTPUT string is the exact `content[].text` the engine emits for that
// variation (i.e. `formatForLLM(response)`); RESPONSE carries the structured
// `details.response` (null where the renderer must fall back to raw text).

// ─── Types ─────────────────────────────────────────────────────────────────

export interface SearchSource {
	title: string;
	url: string;
	snippet?: string;
	/** ISO date string or relative ("2d ago") */
	publishedDate?: string;
	/** Age in seconds for consistent formatting */
	ageSeconds?: number;
	author?: string;
}

export interface SearchCitation {
	url: string;
	title: string;
	citedText?: string;
}

export interface SearchUsage {
	inputTokens?: number;
	outputTokens?: number;
	/** Citation-rich providers: number of web search requests made */
	searchRequests?: number;
	/** Related-question providers: combined token count */
	totalTokens?: number;
}

export interface SearchResponse {
	provider: string;
	answer?: string;
	sources: SearchSource[];
	citations?: SearchCitation[];
	searchQueries?: string[];
	relatedQuestions?: string[];
	usage?: SearchUsage;
	model?: string;
	requestId?: string;
	authMode?: string;
}

export type WebSearchVariation =
	| "normal"
	| "answer-only"
	| "sources-only"
	| "error"
	| "acme"
	| "perplexity"
	| "fallback";

// ─── Normal · answer + sources (Searchbird) ────────────────────────────────────
export const NORMAL_OUTPUT = [
	"Rivulet is the most widely adopted asynchronous runtime in the fictional Aster ecosystem, offering a multi-threaded work-stealing scheduler and a deep middleware stack. Swiftly mirrors familiar standard-library patterns, which lowers the learning curve, but its development has slowed and most packages now target Rivulet. For new projects, Rivulet is the safer default unless you specifically want std-like ergonomics.",
	"",
	"## Sources",
	"4 sources",
	"[1] Rivulet — An asynchronous Aster runtime (1w ago)",
	"    https://docs.example.org/rivulet/",
	"    Rivulet is an asynchronous runtime for the fictional Aster language. It provides the building blocks needed for reliable network applications without compromising speed.",
	"[2] Swiftly — Async utilities for Aster (3mo ago)",
	"    https://docs.example.org/swiftly/",
	"    Swiftly is a portable Aster async library with familiar read and write primitives for application code.",
	"[3] Choosing an Async Runtime in Aster (1mo ago)",
	"    https://journal.example.org/aster/async-runtimes/",
	"    We compare Rivulet, Swiftly, and Drift across performance, ecosystem maturity, and developer experience to help you pick a runtime.",
	"[4] Is Swiftly still maintained? : Aster Forum (2w ago)",
	"    https://forum.example.org/aster/swiftly-status/",
	"    Community discussion on the maintenance status of Swiftly and why the wider ecosystem has consolidated around Rivulet.",
].join("\n");

// ─── Answer-only · synthesized answer, no sources (Luma Search) ───────────────
export const ANSWER_ONLY_OUTPUT = [
	"Aster 1.0 was released on May 15, 2015. It was the language’s first stable release and introduced strong backward-compatibility guarantees through its edition system.",
].join("\n");

// ─── Sources-only · raw sources, no answer (Searchbird) ───────────────────────
export const SOURCES_ONLY_OUTPUT = [
	"[1] The Best Mechanical Keyboard Switches (5d ago)",
	"    https://reviews.example.org/keyboard/switches",
	"    Our picks for the best tactile, linear, and clicky switches based on extensive in-house testing and measurements.",
	"[2] The Ultimate Guide to Keyboard Switches (2mo ago)",
	"    https://guides.example.org/keyboard-switches/",
	"    A comprehensive guide explaining the differences between linear, tactile, and clicky switches, plus how to pick one.",
	"[3] Favorite switches this year? : Keyboard Forum (1d ago)",
	"    https://forum.example.org/mechanical-keyboards/favorite-switches/",
	"    Community recommendations for the smoothest linear and snappiest tactile switches, with sound tests linked.",
].join("\n");

// ─── Error · provider unavailable ──────────────────────────────────────────────
export const ERROR_OUTPUT = "Error: Search API key not configured.";

// ─── Citation-rich · citations + searchQueries + usage.searchRequests ─────────
export const ACME_OUTPUT = [
	"Componenta 3 introduces Tasks for handling async transitions with automatic pending and error states, the new `read()` API for reading promises and context during render, and stable server components and server tasks. It also adds `usePending` for optimistic UI, `useTaskState` and `useFormState` for forms, support for passing `ref` as a regular prop, and native rendering of document metadata such as `<title>` and `<meta>`.",
	"",
	"## Sources",
	"3 sources",
	"[1] Componenta 3 — Release Notes (6mo ago)",
	"    https://docs.example.org/componenta/3.0/release-notes",
	"    Componenta 3 is now stable. This post covers Tasks, the read API, server components, and the new form hooks.",
	"[2] Componenta 3 Upgrade Guide (7mo ago)",
	"    https://docs.example.org/componenta/3.0/upgrade-guide",
	"    Step-by-step guidance for migrating an existing app to Componenta 3, including codemods and breaking changes.",
	"[3] What’s new in Componenta 3 (5mo ago)",
	"    https://journal.example.org/componenta/3.0/overview",
	"    A practical walkthrough of the headline Componenta 3 features with code examples for Tasks and usePending.",
	"",
	"## Citations",
	"2 citations",
	"[1] Componenta 3 — Release Notes",
	"    https://docs.example.org/componenta/3.0/release-notes",
	"    Componenta 3 adds support for using async functions in transitions to handle pending states, errors, forms, and optimistic updates automatically.",
	"[2] read — Componenta Reference",
	"    https://docs.example.org/componenta/3.0/reference/read",
	"    read is a Componenta API that lets you read the value of a resource like a Promise or context.",
	"Search queries: 3",
	"- Componenta 3 new features",
	"- Componenta 3 release notes",
	"- Componenta 3 tasks usePending read API",
].join("\n");

// ─── Related-question · citations + relatedQuestions + usage.totalTokens ───────
export const PERPLEXITY_OUTPUT = [
	"Retrieval-augmented generation (RAG) combines a retrieval step with a generative model. A user query is embedded and used to fetch the most relevant chunks from a vector store of documents; those chunks are then injected into the model’s prompt as grounding context. The model generates an answer conditioned on the retrieved passages, which reduces hallucination and lets the system cite sources without retraining the underlying model.",
	"",
	"## Sources",
	"3 sources",
	"[1] What is Retrieval-Augmented Generation (RAG)? (4mo ago)",
	"    https://docs.example.org/knowledge/retrieval-augmented-generation/",
	"    RAG improves generated answers by referencing an authoritative knowledge base outside its training data before producing a response.",
	"[2] Retrieval-Augmented Generation for Knowledge-Intensive Tasks (2020-05-22)",
	"    https://papers.example.org/retrieval-augmented-generation/",
	"    A reference paper introduces a model combining a pre-trained retriever with a sequence-to-sequence generator for open-domain question answering.",
	"[3] A Practical Guide to Building RAG Pipelines (1mo ago)",
	"    https://guides.example.org/retrieval-augmented-generation/",
	"    Covers chunking strategies, embedding models, vector search, and prompt construction for production RAG systems.",
	"",
	"## Citations",
	"1 citation",
	"[1] What is RAG? — Example Knowledge Base",
	"    https://docs.example.org/knowledge/retrieval-augmented-generation/",
	"    RAG extends model capabilities to specific domains without the need to retrain the underlying model.",
	"",
	"## Related",
	"3 questions",
	"- What is the difference between RAG and fine-tuning?",
	"- Which vector databases work best for RAG?",
	"- How do you evaluate a RAG pipeline?",
].join("\n");

// ─── Fallback · no details.response, raw text only ─────────────────────────────
export const FALLBACK_OUTPUT = [
	"RenderGrid reached Candidate Recommendation status in 2025, with several refinements to the API since the initial Working Draft.",
	"",
	"Key changes include a revised bind group layout, the addition of subgroup operations for parallel workgroup communication, and clearer semantics around timestamp queries. Browser-engine support has widened, while several engines continue to enable it behind flags.",
	"",
	"Projects migrating from earlier drafts should review the deprecation of ExternalFrameTexture handling and the reworked error-scope model, both of which can surface as silent validation failures if left unmigrated.",
].join("\n");

// ─── Output text by variation ───────────────────────────────────────────

export const OUTPUT: Record<WebSearchVariation, string> = {
	normal: NORMAL_OUTPUT,
	"answer-only": ANSWER_ONLY_OUTPUT,
	"sources-only": SOURCES_ONLY_OUTPUT,
	error: ERROR_OUTPUT,
	acme: ACME_OUTPUT,
	perplexity: PERPLEXITY_OUTPUT,
	fallback: FALLBACK_OUTPUT,
};

// ─── Structured details.response by variation ────────────────────────────────────

export const RESPONSE: Record<WebSearchVariation, SearchResponse | null> = {
	normal: {
		provider: "searchbird",
		answer:
			"Rivulet is the most widely adopted asynchronous runtime in the fictional Aster ecosystem, offering a multi-threaded work-stealing scheduler and a deep middleware stack. Swiftly mirrors familiar standard-library patterns, which lowers the learning curve, but its development has slowed and most packages now target Rivulet. For new projects, Rivulet is the safer default unless you specifically want std-like ergonomics.",
		sources: [
			{
				title: "Rivulet — An asynchronous Aster runtime",
				url: "https://docs.example.org/rivulet/",
				snippet:
					"Rivulet is an asynchronous runtime for the fictional Aster language. It provides the building blocks needed for reliable network applications without compromising speed.",
				ageSeconds: 604800,
			},
			{
				title: "Swiftly — Async utilities for Aster",
				url: "https://docs.example.org/swiftly/",
				snippet:
					"Swiftly is a portable Aster async library with familiar read and write primitives for application code.",
				ageSeconds: 7776000,
			},
			{
				title: "Choosing an Async Runtime in Aster",
				url: "https://journal.example.org/aster/async-runtimes/",
				snippet:
					"We compare Rivulet, Swiftly, and Drift across performance, ecosystem maturity, and developer experience to help you pick a runtime.",
				ageSeconds: 2592000,
				author: "Tess Rowan",
			},
			{
				title: "Is Swiftly still maintained? : Aster Forum",
				url: "https://forum.example.org/aster/swiftly-status/",
				snippet:
					"Community discussion on the maintenance status of Swiftly and why the wider ecosystem has consolidated around Rivulet.",
				ageSeconds: 1209600,
				author: "Aster Forum",
			},
		],
		authMode: "api_key",
		requestId: "searchbird-7f3a9c21-d4e8-4b1a-9c2e-1f6a8b3d5e07",
	},
	"answer-only": {
		provider: "luma-search",
		answer:
			"Aster 1.0 was released on May 15, 2015. It was the language’s first stable release and introduced strong backward-compatibility guarantees through its edition system.",
		sources: [],
		model: "luma-2.5-swift",
		usage: {
			inputTokens: 146,
			outputTokens: 52,
		},
		authMode: "oauth",
	},
	"sources-only": {
		provider: "searchbird",
		sources: [
			{
				title: "The Best Mechanical Keyboard Switches",
				url: "https://reviews.example.org/keyboard/switches",
				snippet:
					"Our picks for the best tactile, linear, and clicky switches based on extensive in-house testing and measurements.",
				ageSeconds: 432000,
				author: "Example Reviews",
			},
			{
				title: "The Ultimate Guide to Keyboard Switches",
				url: "https://guides.example.org/keyboard-switches/",
				snippet:
					"A comprehensive guide explaining the differences between linear, tactile, and clicky switches, plus how to pick one.",
				ageSeconds: 5184000,
			},
			{
				title: "Favorite switches this year? : Keyboard Forum",
				url: "https://forum.example.org/mechanical-keyboards/favorite-switches/",
				snippet:
					"Community recommendations for the smoothest linear and snappiest tactile switches, with sound tests linked.",
				ageSeconds: 86400,
				author: "Keyboard Forum",
			},
		],
		authMode: "api_key",
	},
	error: null,
	acme: {
		provider: "citable",
		answer:
			"Componenta 3 introduces Tasks for handling async transitions with automatic pending and error states, the new `read()` API for reading promises and context during render, and stable server components and server tasks. It also adds `usePending` for optimistic UI, `useTaskState` and `useFormState` for forms, support for passing `ref` as a regular prop, and native rendering of document metadata such as `<title>` and `<meta>`.",
		sources: [
			{
				title: "Componenta 3 — Release Notes",
				url: "https://docs.example.org/componenta/3.0/release-notes",
				snippet:
					"Componenta 3 is now stable. This post covers Tasks, the read API, server components, and the new form hooks.",
				ageSeconds: 15552000,
			},
			{
				title: "Componenta 3 Upgrade Guide",
				url: "https://docs.example.org/componenta/3.0/upgrade-guide",
				snippet:
					"Step-by-step guidance for migrating an existing app to Componenta 3, including codemods and breaking changes.",
				ageSeconds: 18144000,
			},
			{
				title: "What’s new in Componenta 3",
				url: "https://journal.example.org/componenta/3.0/overview",
				snippet:
					"A practical walkthrough of the headline Componenta 3 features with code examples for Tasks and usePending.",
				ageSeconds: 13392000,
				author: "Mara Ives",
			},
		],
		citations: [
			{
				url: "https://docs.example.org/componenta/3.0/release-notes",
				title: "Componenta 3 — Release Notes",
				citedText:
					"Componenta 3 adds support for using async functions in transitions to handle pending states, errors, forms, and optimistic updates automatically.",
			},
			{
				url: "https://docs.example.org/componenta/3.0/reference/read",
				title: "read — Componenta Reference",
				citedText: "read is a Componenta API that lets you read the value of a resource like a Promise or context.",
			},
		],
		searchQueries: [
			"Componenta 3 new features",
			"Componenta 3 release notes",
			"Componenta 3 tasks usePending read API",
		],
		usage: {
			inputTokens: 1284,
			outputTokens: 312,
			searchRequests: 3,
		},
		model: "citable-4.5",
		requestId: "req_011CRSt6vQh8mN4kZpW3xYbA",
		authMode: "oauth",
	},
	perplexity: {
		provider: "horizon",
		answer:
			"Retrieval-augmented generation (RAG) combines a retrieval step with a generative model. A user query is embedded and used to fetch the most relevant chunks from a vector store of documents; those chunks are then injected into the model’s prompt as grounding context. The model generates an answer conditioned on the retrieved passages, which reduces hallucination and lets the system cite sources without retraining the underlying model.",
		sources: [
			{
				title: "What is Retrieval-Augmented Generation (RAG)?",
				url: "https://docs.example.org/knowledge/retrieval-augmented-generation/",
				snippet:
					"RAG improves generated answers by referencing an authoritative knowledge base outside its training data before producing a response.",
				ageSeconds: 10368000,
			},
			{
				title: "Retrieval-Augmented Generation for Knowledge-Intensive Tasks",
				url: "https://papers.example.org/retrieval-augmented-generation/",
				snippet:
					"A reference paper introduces a model combining a pre-trained retriever with a sequence-to-sequence generator for open-domain question answering.",
				author: "Morgan et al.",
				publishedDate: "2020-05-22",
			},
			{
				title: "A Practical Guide to Building RAG Pipelines",
				url: "https://guides.example.org/retrieval-augmented-generation/",
				snippet:
					"Covers chunking strategies, embedding models, vector search, and prompt construction for production RAG systems.",
				ageSeconds: 4320000,
			},
		],
		citations: [
			{
				url: "https://docs.example.org/knowledge/retrieval-augmented-generation/",
				title: "What is RAG? — Example Knowledge Base",
				citedText:
					"RAG extends model capabilities to specific domains without the need to retrain the underlying model.",
			},
		],
		relatedQuestions: [
			"What is the difference between RAG and fine-tuning?",
			"Which vector databases work best for RAG?",
			"How do you evaluate a RAG pipeline?",
		],
		usage: {
			totalTokens: 1843,
		},
		model: "horizon-pro",
		authMode: "api_key",
	},
	fallback: null,
};

// ─── Inputs ───────────────────────────────────────────────────────────────

export const INPUT: Record<WebSearchVariation, Record<string, unknown>> = {
	normal: {
		query: "rivulet vs swiftly aster runtime",
		provider: "searchbird",
	},
	"answer-only": {
		query: "what year did Aster 1.0 release",
		provider: "luma-search",
	},
	"sources-only": {
		query: "best mechanical keyboard switches",
		provider: "searchbird",
		num_search_results: 3,
	},
	error: {
		query: "latest stable toolchain version",
		provider: "searchbird",
	},
	acme: {
		query: "what are the new features in Componenta 3",
		provider: "citable",
		recency: "year",
	},
	perplexity: {
		query: "how does retrieval augmented generation work",
		provider: "horizon",
	},
	fallback: {
		query: "summarize the latest RenderGrid spec changes",
		provider: "synthetic",
	},
};
