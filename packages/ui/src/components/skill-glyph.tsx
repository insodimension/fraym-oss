import type { ReactNode } from "react";
import { GENERIC_PLUGIN_ICONS } from "../icons/generic-plugin-icons";
import { cn } from "../lib/cn";
import { brandMarkFor } from "./brand-marks";

/**
 * A skill's visual mark: the plugin brand mark when the name maps to one
 * (gmail, github, slack, …), else the plugin gallery's skills book glyph.
 * ONE resolver for every surface that names a skill — tool-card heads,
 * capability chips, mention menus — so a skill never has two faces.
 */
export function SkillGlyph({
	name,
	size = 14,
	className,
}: {
	readonly name: string;
	readonly size?: number;
	readonly className?: string;
}): ReactNode {
	return (
		<span className={cn("inline-flex shrink-0 items-center justify-center", className)}>
			{brandMarkFor(name, size) ?? (
				<img
					src={GENERIC_PLUGIN_ICONS.skills}
					alt=""
					aria-hidden
					width={size}
					height={size}
					className="object-contain"
				/>
			)}
		</span>
	);
}
