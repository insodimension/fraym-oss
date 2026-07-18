import { cn } from "../lib/cn";

export function Card({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="card"
			className={cn("rounded-[9px] border border-fr-border-soft bg-fr-surface overflow-hidden", className)}
			{...props}
		/>
	);
}

export function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
	return <div data-slot="card-header" className={cn("fr-eyebrow p-[10px_12px_8px]", className)} {...props} />;
}

export function CardContent({ className, ...props }: React.ComponentProps<"div">) {
	return <div data-slot="card-content" className={cn("px-3 py-2.5", className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="card-footer"
			className={cn(
				"flex items-center gap-2 border-t border-fr-border-soft px-3 py-2 font-secondary text-fr-xs",
				className,
			)}
			{...props}
		/>
	);
}
