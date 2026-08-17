import type { CSSProperties } from "react";
import { cn } from "../lib/cn";

export const fraymBrandMarkUrl = new URL("../assets/brand/fraym-logo.png", import.meta.url).href;

export interface FraymBrandMarkProps {
	readonly className?: string;
	readonly decorative?: boolean;
	readonly label?: string;
	readonly size?: number | string;
	readonly style?: CSSProperties;
	/** Override the rendered mark with a host-supplied logo URL; defaults to the
	 *  bundled {@link fraymBrandMarkUrl}. A consumer that white-labels the frame
	 *  passes its own asset instead of patching this package. */
	readonly brandMarkUrl?: string;
}

export function FraymBrandMark({
	className,
	decorative = true,
	label = "Fraym",
	size = 22,
	style,
	brandMarkUrl = fraymBrandMarkUrl,
}: FraymBrandMarkProps) {
	return (
		<img
			src={brandMarkUrl}
			alt={decorative ? "" : label}
			aria-hidden={decorative ? "true" : undefined}
			draggable={false}
			className={cn("block shrink-0 select-none object-contain", className)}
			style={{ width: size, height: size, ...style }}
		/>
	);
}
