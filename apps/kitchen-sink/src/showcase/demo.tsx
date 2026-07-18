import { cn } from "../compat/ui";
import type { ReactNode } from "react";

/**
 * Standard layout for every showcase entry: a one-line description, the real
 * import path, a framed live preview, and (optionally) a configuration panel.
 */
export function Demo({
	summary,
	importPath,
	controls,
	children,
	stage = "center",
	clip = true,
}: {
	readonly summary: string;
	readonly importPath: string;
	readonly controls?: ReactNode;
	readonly children: ReactNode;
	readonly stage?: "center" | "start" | "stretch";
	readonly clip?: boolean;
}) {
	return (
		<div className="flex flex-col gap-5">
			<p className="max-w-2xl text-fr-base leading-relaxed text-fr-text-2">{summary}</p>
			<code className="w-fit rounded-md border border-fr-border-soft bg-fr-surface px-2.5 py-1 font-secondary text-fr-xs text-fr-text-3">
				import {"{ … }"} from "{importPath}"
			</code>
			<div className={cn("grid gap-4", controls && "lg:grid-cols-[minmax(0,1fr)_280px]")}>
				<div
					className={cn(
						clip ? "overflow-auto" : "overflow-visible",
						"flex min-h-[180px] gap-5 rounded-xl border border-fr-border-soft bg-fr-bg p-6",
						stage === "center" && "items-center justify-center",
						stage === "start" && "flex-col items-start",
						stage === "stretch" && "flex-col items-stretch",
					)}
				>
					{children}
				</div>
				{controls && (
					<aside className="h-fit rounded-xl border border-fr-border-soft bg-fr-surface p-4 lg:sticky lg:top-[88px]">
						{controls}
					</aside>
				)}
			</div>
		</div>
	);
}

/** A labeled example cell — for static "all states / variants" galleries. */
