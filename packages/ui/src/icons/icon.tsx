import type { IconSpec } from "@fraym/config";
import { memo, type ReactNode } from "react";
import { cn } from "../lib/cn";
import { type IconName, iconPaths } from "./paths";

export interface IconProps extends React.SVGAttributes<SVGSVGElement> {
	readonly name: IconName;
	readonly size?: number;
	readonly strokeWidth?: number;
	readonly filled?: boolean;
}

export const Icon = memo(function Icon({
	name,
	size = 16,
	strokeWidth = 1.8,
	filled = false,
	viewBox = "0 0 24 24",
	className,
	...props
}: IconProps) {
	const parts = iconPaths[name].split("|");
	return (
		<svg
			data-slot="icon"
			width={size}
			height={size}
			viewBox={viewBox}
			fill={filled ? "currentColor" : "none"}
			stroke={filled ? "none" : "currentColor"}
			strokeWidth={strokeWidth}
			strokeLinecap="round"
			strokeLinejoin="round"
			className={cn("shrink-0", className)}
			{...props}
		>
			{parts.map((d, i) => (
				<path key={i} d={d} />
			))}
		</svg>
	);
});

// Filled brand logos (e.g. the Unreal mark) render solid, not stroked.
const LOGO_ICONS: Record<string, true> = { unreal: true };

/**
 * Resolve an `IconSpec` to a renderable node: a mono `iconPaths` glyph (filled for
 * brand logos), else `null` so the caller falls back to its kind-based default icon.
 * Any `spec.color` tint is applied by the wrapper, not here.
 */
export function toolIconNode(spec: IconSpec, size: number): ReactNode {
	if (spec.icon in iconPaths)
		return <Icon name={spec.icon as IconName} size={size} filled={spec.icon in LOGO_ICONS} />;
	return null;
}
