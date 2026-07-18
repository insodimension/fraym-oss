import { cn } from "../lib/cn";

/** Inline monospace code — the `<code>` chip used in prose and diagrams. */
export interface CodeProps extends React.ComponentProps<"code"> {}

export function Code({ className, ...props }: CodeProps) {
	return (
		<code data-slot="code" className={cn("font-secondary text-[0.92em] text-fr-inline-code", className)} {...props} />
	);
}
