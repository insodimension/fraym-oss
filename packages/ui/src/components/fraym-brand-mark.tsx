import type { CSSProperties } from "react";
import { cn } from "../lib/cn";

export const fraymBrandMarkUrl = new URL("../assets/brand/fraym-logo.png", import.meta.url).href;

export interface FraymBrandMarkProps {
	readonly className?: string;
	readonly decorative?: boolean;
	readonly label?: string;
	readonly size?: number | string;
	readonly style?: CSSProperties;
}

export function FraymBrandMark({
	className,
	decorative = true,
	label = "Fraym",
	size = 22,
	style,
}: FraymBrandMarkProps) {
	return (
		<img
			src={fraymBrandMarkUrl}
			alt={decorative ? "" : label}
			aria-hidden={decorative ? "true" : undefined}
			draggable={false}
			className={cn("block shrink-0 select-none object-contain", className)}
			style={{ width: size, height: size, ...style }}
		/>
	);
}
