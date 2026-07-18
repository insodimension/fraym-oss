import type { ReactNode } from "react";

/** A single copy-pasteable example with a label and code block. */
export interface DocExample {
	/** Short label shown above the code block. */
	readonly label: string;
	/** The code snippet. */
	readonly code: string;
	/** Optional live preview node rendered beside or below the code. */
	readonly preview?: ReactNode;
}

/** API reference entry for a single prop. */
export interface DocProp {
	/** Prop name. */
	readonly name: string;
	/** TypeScript type. */
	readonly type: string;
	/** Default value, if any. */
	readonly default?: string;
	/** Whether the prop is required. */
	readonly required?: boolean;
	/** Description. */
	readonly description: string;
}

/** Structured documentation for a single showcase entry. */
export interface EntryDocs {
	/** One-line import statement. */
	readonly import: string;
	/** The composable anatomy — how the element is assembled / used. */
	readonly anatomy: string;
	/** Copy-pasteable examples. */
	readonly examples: readonly DocExample[];
	/** Exhaustive API reference. */
	readonly api: readonly DocProp[];
}

