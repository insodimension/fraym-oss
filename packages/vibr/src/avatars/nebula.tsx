import { useEffect, useRef } from "react";
import "../css/avatars.css";
import type { AvatarProps } from "../types";

const LAYERS = ["blob-1", "blob-2", "blob-3", "blob-4", "blob-1 alt", "blob-2 alt", "blob-3 alt", "blob-4 alt"];

export { Nebula as NebulaOrb };

export function Nebula({ state = "idle", mode = "", energy = 0, className }: AvatarProps) {
	const ref = useRef<HTMLSpanElement>(null);

	useEffect(() => {
		const root = ref.current;
		if (!root) return;

		const rate = 1 + 1.6 * Math.max(0, Math.min(1, energy ?? 0));

		root.querySelectorAll<SVGPathElement>(".blob path").forEach(p => {
			if (p.getAnimations) {
				p.getAnimations().forEach(a => {
					a.playbackRate = rate;
				});
			}
		});
	}, [energy]);

	return (
		<span
			className={`nebula${className ? ` ${className}` : ""}`}
			data-slot="vibr-nebula"
			data-state={state}
			data-mode={mode}
			ref={ref}
			aria-hidden="true"
		>
			<span className="nb-stage">
				<svg viewBox="0 0 1200 1200">
					{LAYERS.map((c, i) => (
						<g className={`blob ${c}`} key={i}>
							<path></path>
						</g>
					))}
				</svg>
			</span>
		</span>
	);
}
