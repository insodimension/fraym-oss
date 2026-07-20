"use client";

// CodeView — the shared code surface, built on CodeMirror 6 (read-only). Gives
// text selection, in-file find (⌘F), code folding, line numbers, active-line, and
// reveal-to-line — the things a Shiki-HTML preview can't. Theme is pure fr-tokens
// (CSS vars), so it re-skins with the app; syntax colors map lezer tags onto the
// existing semantic tokens (no hardcoded hex). Editable mode can be enabled later.

import { HighlightStyle, LanguageDescription, syntaxHighlighting } from "@codemirror/language";
import { languages } from "@codemirror/language-data";
import type { Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { tags as t } from "@lezer/highlight";
import CodeMirror, { type ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "../../lib/cn";

// Chrome (background, gutters, selection, cursor, search, panels) — all fr-tokens.
const fraymTheme = EditorView.theme(
	{
		"&": { color: "var(--fr-text)", backgroundColor: "transparent" },
		"&.cm-focused": { outline: "none" },
		".cm-scroller": { fontFamily: "var(--fr-font-mono)", lineHeight: "1.5" },
		".cm-content": { padding: "8px 0", caretColor: "var(--fr-accent)" },
		".cm-gutters": { backgroundColor: "transparent", color: "var(--fr-text-3)", border: "none" },
		".cm-lineNumbers .cm-gutterElement": { padding: "0 6px 0 12px", minWidth: "28px" },
		".cm-activeLine": { backgroundColor: "color-mix(in oklab, var(--fr-surface) 60%, transparent)" },
		".cm-activeLineGutter": { backgroundColor: "transparent", color: "var(--fr-text-2)" },
		".cm-foldGutter .cm-gutterElement": { color: "var(--fr-text-3)" },
		".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--fr-accent)" },
		"&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": {
			backgroundColor: "var(--fr-accent-dim)",
		},
		".cm-selectionMatch": { backgroundColor: "var(--fr-accent-dim)" },
		".cm-searchMatch": { backgroundColor: "var(--fr-accent-dim)", outline: "1px solid var(--fr-accent-line)" },
		".cm-searchMatch.cm-searchMatch-selected": { backgroundColor: "var(--fr-accent-line)" },
		".cm-panels": {
			backgroundColor: "var(--fr-surface)",
			color: "var(--fr-text)",
			borderColor: "var(--fr-border-soft)",
		},
		".cm-panel input, .cm-panel button": { fontFamily: "var(--fr-font-primary)" },
		".cm-foldPlaceholder": { backgroundColor: "var(--fr-surface-2)", color: "var(--fr-text-3)", border: "none" },
	},
	{ dark: true },
);

// Token colors mapped onto existing semantic tokens — on-brand, no hardcoded hex.
const fraymHighlight = HighlightStyle.define([
	{ tag: [t.keyword, t.modifier, t.controlKeyword, t.operatorKeyword, t.moduleKeyword], color: "var(--fr-iris)" },
	{ tag: [t.string, t.special(t.string), t.regexp], color: "var(--fr-add)" },
	{ tag: [t.number, t.bool, t.null, t.atom], color: "var(--fr-warn)" },
	{ tag: [t.comment, t.lineComment, t.blockComment, t.docComment], color: "var(--fr-text-3)", fontStyle: "italic" },
	{ tag: [t.function(t.variableName), t.function(t.propertyName), t.labelName], color: "var(--fr-blue)" },
	{ tag: [t.typeName, t.className, t.namespace], color: "var(--fr-warn)" },
	{ tag: [t.propertyName, t.attributeName], color: "var(--fr-text)" },
	{ tag: [t.variableName, t.definition(t.variableName)], color: "var(--fr-text)" },
	{ tag: [t.operator, t.punctuation, t.separator, t.bracket, t.derefOperator], color: "var(--fr-text-2)" },
	{ tag: [t.tagName, t.angleBracket], color: "var(--fr-accent)" },
	{ tag: [t.link, t.url], color: "var(--fr-blue)", textDecoration: "underline" },
	{ tag: [t.heading], color: "var(--fr-text)", fontWeight: "600" },
	{ tag: [t.invalid], color: "var(--fr-del)" },
]);

function useLanguageExtension(path?: string, languageOverride?: string): Extension | null {
	const [ext, setExt] = useState<Extension | null>(null);
	useEffect(() => {
		let cancelled = false;
		const filename = path?.split(/[\\/]/).pop() ?? path;
		const desc = languageOverride
			? LanguageDescription.matchLanguageName(languages, languageOverride, true)
			: filename
				? LanguageDescription.matchFilename(languages, filename)
				: null;
		if (!desc) {
			setExt(null);
			return;
		}
		desc
			.load()
			.then(support => {
				if (!cancelled) setExt(support);
			})
			.catch(() => {
				if (!cancelled) setExt(null);
			});
		return () => {
			cancelled = true;
		};
	}, [path, languageOverride]);
	return ext;
}

export interface CodeViewProps {
	readonly content: string;
	/** Path drives language detection + is the label owner (header lives outside). */
	readonly path?: string;
	/** Explicit CodeMirror language name, overriding path detection. */
	readonly language?: string;
	readonly wrap?: boolean;
	/** 1-based line to select + scroll to (reveal-to-line). */
	readonly revealLine?: number;
	readonly maxHeight?: number | string;
	readonly className?: string;
}

export function CodeView({ content, path, language, wrap = false, revealLine, maxHeight, className }: CodeViewProps) {
	const langExt = useLanguageExtension(path, language);
	const ref = useRef<ReactCodeMirrorRef>(null);

	const extensions = useMemo(() => {
		const list: Extension[] = [fraymTheme, syntaxHighlighting(fraymHighlight), EditorView.editable.of(false)];
		if (wrap) list.push(EditorView.lineWrapping);
		if (langExt) list.push(langExt);
		return list;
	}, [langExt, wrap]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: `content` is an intentional trigger — the effect reads the CodeMirror doc via `ref` (not `content` textually), so it must re-run to re-reveal the line after the document content updates; removing it would skip re-reveal on content change.
	useEffect(() => {
		if (!revealLine) return;
		const view = ref.current?.view;
		if (!view) return;
		const lineNo = Math.max(1, Math.min(revealLine, view.state.doc.lines));
		const line = view.state.doc.line(lineNo);
		view.dispatch({
			selection: { anchor: line.from },
			effects: EditorView.scrollIntoView(line.from, { y: "center" }),
		});
	}, [revealLine, content]);

	return (
		<CodeMirror
			ref={ref}
			value={content}
			readOnly
			editable={false}
			theme="none"
			height="100%"
			extensions={extensions}
			basicSetup={{
				lineNumbers: true,
				foldGutter: true,
				highlightActiveLine: true,
				highlightActiveLineGutter: true,
				bracketMatching: true,
				highlightSelectionMatches: true,
				searchKeymap: true,
				autocompletion: false,
				closeBrackets: false,
				allowMultipleSelections: true,
				drawSelection: true,
			}}
			style={{ maxHeight, fontSize: "var(--fr-code-size, 12px)" }}
			className={cn("fr-code-view h-full", className)}
		/>
	);
}
