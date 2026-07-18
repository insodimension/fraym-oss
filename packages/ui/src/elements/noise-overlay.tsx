/**
 * NoiseOverlay — an animated film-grain layer: a low-alpha field of random
 * grayscale pixels refreshed every few frames, stretched to fill the parent.
 * Fraym-native port of react-bits' "Noise" (MIT,
 * https://reactbits.dev/animations/noise) MECHANISM, renamed from `Noise` to
 * avoid a bare-noun clash and re-scoped from the origin's fixed 100vw/100vh
 * viewport to the nearest positioned ancestor (`absolute inset-0`) so it
 * composes as an ordinary overlay element.
 *
 * A small square canvas (`patternSize`) is filled with random gray + a low
 * `patternAlpha`, then CSS-scaled to cover the parent with `image-rendering:
 * pixelated`; a self-contained rAF redraws it every `patternRefreshInterval`
 * frames. `pointer-events-none`, and the low default alpha keeps the grain
 * subtle on light surfaces as well as dark. (The origin's unused
 * `patternScaleX` / `patternScaleY` props are dropped; see the port report.)
 *
 * Reduced motion: the grain is decorative and continuous, so under the
 * preference we paint ONE static frame and never loop.
 */

import { useEffect, useRef } from "react";
import { cn } from "../lib/cn";
import { useReducedMotion } from "./media-queries";

export interface NoiseOverlayProps {
	readonly className?: string;
	/** Grain texture resolution in px per side; CSS-scaled to fill the parent. Default 1024. */
	readonly patternSize?: number;
	/** Frames between grain refreshes; higher = calmer. Default 2. */
	readonly patternRefreshInterval?: number;
	/** Per-grain alpha (0..255); keep low so it stays subtle on light surfaces. Default 15. */
	readonly patternAlpha?: number;
}

export function NoiseOverlay({
	className,
	patternSize = 1024,
	patternRefreshInterval = 2,
	patternAlpha = 15,
}: NoiseOverlayProps) {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const reduced = useReducedMotion();

	useEffect(() => {
		const canvas = canvasRef.current;
		const ctx = canvas?.getContext("2d", { alpha: true });
		if (!canvas || !ctx) return;
		const side = Math.max(1, Math.round(patternSize));
		canvas.width = side;
		canvas.height = side;

		const drawGrain = () => {
			const image = ctx.createImageData(side, side);
			const data = image.data;
			for (let i = 0; i < data.length; i += 4) {
				const value = Math.random() * 255;
				data[i] = value;
				data[i + 1] = value;
				data[i + 2] = value;
				data[i + 3] = patternAlpha;
			}
			ctx.putImageData(image, 0, 0);
		};

		if (reduced) {
			drawGrain();
			return;
		}

		let frame = 0;
		let raf = 0;
		const interval = Math.max(1, Math.round(patternRefreshInterval));
		const loop = () => {
			if (frame % interval === 0) drawGrain();
			frame++;
			raf = requestAnimationFrame(loop);
		};
		loop();
		return () => cancelAnimationFrame(raf);
	}, [patternSize, patternRefreshInterval, patternAlpha, reduced]);

	return (
		<canvas
			ref={canvasRef}
			aria-hidden
			data-slot="noise-overlay"
			className={cn("pointer-events-none absolute inset-0 block size-full", className)}
			style={{ imageRendering: "pixelated" }}
		/>
	);
}
