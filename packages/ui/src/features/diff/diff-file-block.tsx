import { useMemo } from "react";
import { useShikiLineHtml } from "../../elements/code-block";
import { cn } from "../../lib/cn";
import { detectLanguage } from "../code-viewer/code-viewer";
import { ToolBodySection } from "../tool-card/tool-body-card";
import type { DiffViewerFile, DiffViewerLine, DiffViewerLineKind, DiffViewMode } from "./diff-types";
import { pairForSplit, type SplitPair } from "./split-pairs";

interface DiffRowsProps {
	readonly file: DiffViewerFile;
	readonly splitPairs: readonly SplitPair[] | null;
	readonly showLineNumbers: boolean;
	readonly htmlByLine: ReadonlyMap<DiffViewerLine, string>;
}

export interface DiffFileBlockProps {
	readonly file: DiffViewerFile;
	readonly viewMode: DiffViewMode;
	readonly showLineNumbers: boolean;
	readonly maxHeight?: number;
	readonly followTail?: boolean;
	readonly disableOpen?: boolean;
}

const CODE_KIND_CLASS: Record<DiffViewerLineKind, string> = {
	add: "text-[var(--fr-diff-add-code)]",
	del: "text-[var(--fr-diff-del-code)]",
	normal: "",
};

const ROW_BG_CLASS: Record<DiffViewerLineKind | "empty", string> = {
	add: "bg-fr-add-bg",
	del: "bg-fr-del-bg",
	normal: "",
	empty: "",
};

function gutter(no: number | undefined, _kind: DiffViewerLineKind | "empty") {
	return (
		<span
			className={cn(
				"w-[46px] flex-none select-none border-r border-fr-border-soft py-0 pr-2.5 pl-0 text-right text-[var(--fr-diff-gutter)]",
			)}
		>
			{no ?? ""}
		</span>
	);
}

function codeCellClass(line: DiffViewerLine | null): string {
	return cn("fr-shiki-code flex-1 px-3.5 py-0 text-fr-text", line ? CODE_KIND_CLASS[line.kind] : undefined);
}

function highlightedCodeCell(className: string, html: string) {
	return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

function plainCodeCell(className: string, line: DiffViewerLine | null) {
	return <span className={className}>{line?.content ?? ""}</span>;
}

function codeCell(line: DiffViewerLine | null, html?: string) {
	const className = codeCellClass(line);
	return html != null ? highlightedCodeCell(className, html) : plainCodeCell(className, line);
}

function rowBg(kind: DiffViewerLineKind | "empty") {
	return ROW_BG_CLASS[kind];
}

function diffFilePath(file: DiffViewerFile): string {
	return file.newPath ?? file.oldPath ?? "untitled";
}

function useDiffLineHtmlMap(file: DiffViewerFile, path: string): ReadonlyMap<DiffViewerLine, string> {
	const lineHtml = useShikiLineHtml(
		file.lines.map(line => line.content),
		detectLanguage(path),
	);
	return useMemo(() => {
		const m = new Map<DiffViewerLine, string>();
		if (lineHtml) {
			file.lines.forEach((line, index) => {
				const html = lineHtml[index];
				if (html != null) m.set(line, html);
			});
		}
		return m;
	}, [file.lines, lineHtml]);
}

function DiffFileMeta({ file }: { readonly file: DiffViewerFile }) {
	return (
		<>
			{file.isNew && <span className="shrink-0 text-fr-add">new</span>}
			{file.isDeleted && <span className="shrink-0 text-fr-del">deleted</span>}
			{file.error ? <span className="shrink-0 text-fr-del">failed</span> : null}
		</>
	);
}

function DiffFileStat({ file }: { readonly file: DiffViewerFile }) {
	return (
		<>
			<span className="text-fr-add">+{file.additions}</span>
			{file.deletions > 0 && <span className="text-fr-del">&minus;{file.deletions}</span>}
		</>
	);
}

function ErrorDiffRows({ error }: { readonly error: string }) {
	return <div className="whitespace-pre-wrap px-3 py-2 text-fr-del">{error}</div>;
}

function splitCellKind(line: DiffViewerLine | null): DiffViewerLineKind | "empty" {
	return line ? line.kind : "empty";
}

function splitCellHtml(
	line: DiffViewerLine | null,
	htmlByLine: ReadonlyMap<DiffViewerLine, string>,
): string | undefined {
	return line ? htmlByLine.get(line) : undefined;
}

function SplitDiffCell({
	line,
	no,
	sideClassName,
	showLineNumbers,
	htmlByLine,
}: {
	readonly line: DiffViewerLine | null;
	readonly no: number | undefined;
	readonly sideClassName: string;
	readonly showLineNumbers: boolean;
	readonly htmlByLine: ReadonlyMap<DiffViewerLine, string>;
}) {
	const kind = splitCellKind(line);
	return (
		<div className={cn(sideClassName, rowBg(kind))}>
			{showLineNumbers && gutter(no, kind)}
			{codeCell(line, splitCellHtml(line, htmlByLine))}
		</div>
	);
}

function SplitDiffRows({
	splitPairs,
	showLineNumbers,
	htmlByLine,
}: {
	readonly splitPairs: readonly SplitPair[];
	readonly showLineNumbers: boolean;
	readonly htmlByLine: ReadonlyMap<DiffViewerLine, string>;
}) {
	return splitPairs.map((pair, idx) => (
		<div key={idx} className="flex">
			<SplitDiffCell
				line={pair.left}
				no={pair.left?.oldNo}
				sideClassName="flex w-1/2 border-r border-fr-border-soft"
				showLineNumbers={showLineNumbers}
				htmlByLine={htmlByLine}
			/>
			<SplitDiffCell
				line={pair.right}
				no={pair.right?.newNo}
				sideClassName="flex w-1/2"
				showLineNumbers={showLineNumbers}
				htmlByLine={htmlByLine}
			/>
		</div>
	));
}

function unifiedGutterNumber(line: DiffViewerLine): number | undefined {
	return line.kind === "add" ? line.newNo : line.oldNo;
}

function UnifiedDiffRows({ file, showLineNumbers, htmlByLine }: Omit<DiffRowsProps, "splitPairs">) {
	return file.lines.map((line, idx) => (
		<div key={idx} className={cn("flex whitespace-pre", rowBg(line.kind))}>
			{showLineNumbers && gutter(unifiedGutterNumber(line), line.kind)}
			{codeCell(line, htmlByLine.get(line))}
		</div>
	));
}

function DiffFileRows({ file, splitPairs, showLineNumbers, htmlByLine }: DiffRowsProps) {
	if (file.error) return <ErrorDiffRows error={file.error} />;
	if (splitPairs)
		return <SplitDiffRows splitPairs={splitPairs} showLineNumbers={showLineNumbers} htmlByLine={htmlByLine} />;
	return <UnifiedDiffRows file={file} showLineNumbers={showLineNumbers} htmlByLine={htmlByLine} />;
}

export function DiffFileBlock({
	file,
	viewMode,
	showLineNumbers,
	maxHeight,
	followTail,
	disableOpen,
}: DiffFileBlockProps) {
	const splitPairs = useMemo(() => (viewMode === "split" ? pairForSplit(file.lines) : null), [viewMode, file.lines]);
	const path = diffFilePath(file);
	const htmlByLine = useDiffLineHtmlMap(file, path);
	return (
		<ToolBodySection
			title={path}
			meta={<DiffFileMeta file={file} />}
			stat={<DiffFileStat file={file} />}
			openTarget={disableOpen ? undefined : { kind: "diff", path, files: [file] }}
			maxHeight={maxHeight}
			followTail={followTail}
			tailKey={file.lines}
		>
			<DiffFileRows file={file} splitPairs={splitPairs} showLineNumbers={showLineNumbers} htmlByLine={htmlByLine} />
		</ToolBodySection>
	);
}
