import { memo } from "react";
import { cn } from "../lib/cn";

export interface PlainCodeBlockProps {
	readonly code: string;
	readonly lineNumbers?: boolean;
	readonly startLine?: number;
	readonly className?: string;
	readonly codeClassName?: string;
}

function codeLines(code: string): readonly string[] {
	return code.split("\n");
}

export const PlainCodeBlock = memo(function PlainCodeBlock({
	code,
	lineNumbers = false,
	startLine = 1,
	className,
	codeClassName,
}: PlainCodeBlockProps) {
	if (lineNumbers) {
		return (
			<pre
				className={cn(
					"m-0 overflow-auto whitespace-pre bg-transparent p-0 font-secondary text-fr-xs leading-[1.65] text-fr-text",
					className,
				)}
			>
				<code className={codeClassName}>
					{codeLines(code).map((line, index) => (
						<span key={index} className="block">
							<span className="mr-3 inline-block w-[46px] select-none border-r border-fr-border-soft pr-2.5 text-right text-fr-text-3">
								{startLine + index}
							</span>
							<span>{line || " "}</span>
						</span>
					))}
				</code>
			</pre>
		);
	}

	return (
		<pre
			className={cn(
				"m-0 overflow-auto whitespace-pre bg-transparent font-secondary text-fr-xs leading-[1.65] text-fr-text",
				className,
			)}
		>
			<code className={codeClassName}>{code}</code>
		</pre>
	);
});
