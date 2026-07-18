/**
 * IridescenceBackground — a slow, oily shimmer of interfering waves, like light
 * on a soap film. Fraym-native port of react-bits' "Iridescence" (MIT,
 * https://reactbits.dev/backgrounds/iridescence) on the shared
 * {@link ShaderBackground} host — ogl removed, the vec3 `uResolution` collapsed
 * to the host's vec2 `iResolution` (the aspect term recomputed inline), and the
 * JS-fed `uTime` replaced by the host's `iTime`.
 *
 * Theme-native adaptation: the origin renders an OPAQUE full-screen field
 * (`gl_FragColor = vec4(col, 1.0)` over a white clear). Here the field's own
 * luminance drives the ALPHA over a transparent canvas — bright interference
 * bands paint light, dark bands stay transparent — so the shimmer layers as
 * additive light over the caller's `bg-fr-bg` and reads on light AND dark. The
 * tint defaults to the Fraym accent token (the origin's `[1,1,1]` white is not
 * theme-aware); pass `color="#ffffff"` to restore the full-spectrum look.
 *
 * Mouse interaction is OFF by default (backdrops); the origin defaulted it on.
 */

import { useMemo } from "react";
import { ShaderBackground, useCssColors } from "./shader-background";

export interface IridescenceBackgroundProps {
	readonly className?: string;
	/** Shimmer tint. CSS color, tokens welcome. Default the accent token. */
	readonly color?: string;
	/** Wave animation speed. Default 1. */
	readonly speed?: number;
	/** Pointer parallax strength when following. Default 0.1. */
	readonly amplitude?: number;
	/** React to the pointer. Default false (backdrops). */
	readonly mouseReact?: boolean;
	/** Overall light intensity. Default 1. */
	readonly intensity?: number;
	readonly fps?: number;
	readonly renderScale?: number;
}

const FRAGMENT = `
uniform vec2 iResolution;
uniform float iTime;
uniform vec3 uColor;
uniform vec2 uMouse;
uniform float uAmplitude;
uniform float uSpeed;
uniform float uIntensity;

void main() {
	float mr = min(iResolution.x, iResolution.y);
	vec2 uv = (gl_FragCoord.xy / iResolution * 2.0 - 1.0) * iResolution.xy / mr;

	uv += (uMouse - vec2(0.5)) * uAmplitude;

	float d = -iTime * 0.5 * uSpeed;
	float a = 0.0;
	for (int i = 0; i < 8; i++) {
		float fi = float(i);
		a += cos(fi - d - a * uv.x);
		d += sin(uv.y * fi + a);
	}
	d += iTime * 0.5 * uSpeed;
	vec3 col = vec3(cos(uv * vec2(d, a)) * 0.6 + 0.4, cos(a + d) * 0.5 + 0.5);
	col = cos(col * cos(vec3(d, a, 2.5)) * 0.5 + 0.5) * uColor;

	// Opaque-to-additive: luminance becomes coverage over transparency.
	vec3 lit = clamp(col * uIntensity, 0.0, 1.0);
	float alpha = max(lit.r, max(lit.g, lit.b));
	gl_FragColor = vec4(lit * alpha, alpha);
}
`;

export function IridescenceBackground({
	className,
	color = "var(--fr-accent)",
	speed = 1,
	amplitude = 0.1,
	mouseReact = false,
	intensity = 1,
	fps,
	renderScale,
}: IridescenceBackgroundProps) {
	const [rgb] = useCssColors([color]);
	const uniforms = useMemo(
		() => ({
			uColor: rgb ?? [1, 1, 1],
			uSpeed: speed,
			uAmplitude: amplitude,
			uMouse: [0.5, 0.5],
			uIntensity: intensity,
		}),
		[rgb, speed, amplitude, intensity],
	);
	return (
		<ShaderBackground
			slot="iridescence-background"
			className={className}
			fragment={FRAGMENT}
			uniforms={uniforms}
			mouseUniform={mouseReact ? "uMouse" : undefined}
			fps={fps}
			renderScale={renderScale}
		/>
	);
}
