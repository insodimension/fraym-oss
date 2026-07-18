import { Icon } from "../icons";
import { cn } from "../lib/cn";

export type DiffLineKind = "ctx" | "add" | "del";

export interface DiffLine {
	readonly kind: DiffLineKind;
	readonly lineNo: string;
	readonly code: string;
}

export interface DiffBlockProps {
	readonly path: string;
	readonly added: number;
	readonly deleted?: number;
	readonly isNew?: boolean;
	readonly lines: readonly DiffLine[];
	readonly className?: string;
}

function highlightCode(code: string): string {
	let s = code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
	s = s.replace(/('[^']*')/g, '<span style="color:var(--fr-code-str)">$1</span>');
	s = s.replace(
		/\b(import|from|const|let|export|async|function|return|if|new|await|class|implements|constructor|private|test|expect|for|of|type|interface)\b/g,
		'<span style="color:var(--fr-code-kw)">$1</span>',
	);
	return s;
}

export function DiffBlock({ path, added, deleted = 0, isNew, lines, className }: DiffBlockProps) {
	return (
		<div
			data-slot="diff-block"
			className={cn(
				"mt-3 mb-1 min-w-0 max-w-full animate-[fr-rise_0.25s_ease] overflow-hidden rounded-[var(--fr-r)] border border-fr-border",
				className,
			)}
		>
			<div className="flex items-center gap-[9px] bg-fr-surface px-3 py-[9px] font-secondary text-xs">
				<Icon name="file" size={13} strokeWidth={1.8} className="text-fr-text-3" />
				<span className="text-fr-text">{path}</span>
				{isNew && <span className="bg-fr-add-bg text-fr-add">new</span>}
				<span className="ml-auto flex gap-2 text-fr-xs">
					<span className="text-fr-add">+{added}</span>
					{deleted > 0 && <span className="text-fr-del">&minus;{deleted}</span>}
				</span>
			</div>
			<div className="overflow-x-auto border-t border-fr-border-soft bg-[var(--fr-diff-bg)] font-secondary text-xs leading-[1.65]">
				{lines.map((l, i) => (
					<div
						key={i}
						className={cn(
							"flex whitespace-pre",
							l.kind === "add" && "bg-fr-add-bg",
							l.kind === "del" && "bg-fr-del-bg",
						)}
					>
						<span
							className={cn(
								"w-[46px] flex-none select-none border-r border-fr-border-soft py-0 pr-2.5 pl-0 text-right text-[var(--fr-diff-gutter)]",
							)}
						>
							{l.lineNo}
						</span>
						<span
							className={cn(
								"flex-1 px-3.5 py-0 text-fr-text",
								l.kind === "add" && "text-[var(--fr-diff-add-code)]",
								l.kind === "del" && "text-[var(--fr-diff-del-code)]",
							)}
							dangerouslySetInnerHTML={{ __html: highlightCode(l.code) }}
						/>
					</div>
				))}
			</div>
		</div>
	);
}
