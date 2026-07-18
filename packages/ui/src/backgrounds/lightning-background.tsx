/**
 * LightningBackground — a forked bolt of light: an fbm-warped vertical seam
 * that flares to a bright core and flickers frame to frame. Fraym-native port
 * of react-bits' "Lightning" (MIT, https://reactbits.dev/backgrounds/lightning)
 * on the shared {@link ShaderBackground} host — the effect's own raw-WebGL
 * boilerplate dropped, the raw `hue` degree replaced by a CSS color, and the
 * `mainImage` wrapper inlined into `main`.
 *
 * Theme-native: the origin drew the bolt over an opaque dark container. Here the
 * bolt is emitted as ADDITIVE LIGHT over a transparent canvas — the emitted
 * color is premultiplied by its own luminance so the dim field stays clear and
 * only the bolt writes color, which reads on light AND dark surfaces alike. The
 * bolt color defaults to the Fraym accent token and may be ANY CSS color
 * including `var(--fr-*)` (resolved in-tree, retinted on theme swaps).
 */

import { useMemo } from "react";
import { ShaderBackground, useCssColors } from "./shader-background";

export interface LightningBackgroundProps {
	readonly className?: string;
	/** Bolt color. CSS color, tokens welcome. Default the accent token. */
	readonly color?: string;
	/** Horizontal seam offset in aspect-corrected units (0 centered). Default 0. */
	readonly xOffset?: number;
	/** Flicker and warp animation speed. Default 1. */
	readonly speed?: number;
	/** Overall light intensity of the bolt. Default 1. */
	readonly intensity?: number;
	/** fbm warp scale: higher frays the bolt into finer filaments. Default 1. */
	readonly size?: number;
	readonly fps?: number;
	readonly renderScale?: number;
}

const FRAGMENT = `
uniform vec2 iResolution;
uniform float iTime;
uniform vec3 uColor;
uniform float uXOffset;
uniform float uSpeed;
uniform float uIntensity;
uniform float uSize;

#define OCTAVE_COUNT 10

float hash11(float p) {
	p = fract(p * 0.1031);
	p *= p + 33.33;
	p *= p + p;
	return fract(p);
}

float hash12(vec2 p) {
	vec3 p3 = fract(vec3(p.xyx) * 0.1031);
	p3 += dot(p3, p3.yzx + 33.33);
	return fract((p3.x + p3.y) * p3.z);
}

mat2 rotate2d(float theta) {
	float c = cos(theta);
	float s = sin(theta);
	return mat2(c, -s, s, c);
}

float noise(vec2 p) {
	vec2 ip = floor(p);
	vec2 fp = fract(p);
	float a = hash12(ip);
	float b = hash12(ip + vec2(1.0, 0.0));
	float c = hash12(ip + vec2(0.0, 1.0));
	float d = hash12(ip + vec2(1.0, 1.0));
	vec2 t = smoothstep(0.0, 1.0, fp);
	return mix(mix(a, b, t.x), mix(c, d, t.x), t.y);
}

float fbm(vec2 p) {
	float value = 0.0;
	float amp = 0.5;
	for (int i = 0; i < OCTAVE_COUNT; ++i) {
		value += amp * noise(p);
		p *= rotate2d(0.45);
		p *= 2.0;
		amp *= 0.5;
	}
	return value;
}

void main() {
	vec2 uv = gl_FragCoord.xy / iResolution.xy;
	uv = 2.0 * uv - 1.0;
	uv.x *= iResolution.x / iResolution.y;
	uv.x += uXOffset;

	uv += 2.0 * fbm(uv * uSize + 0.8 * iTime * uSpeed) - 1.0;

	float dist = abs(uv.x);
	vec3 col = uColor * (mix(0.0, 0.07, hash11(iTime * uSpeed)) / dist) * uIntensity;
	float a = clamp(max(col.r, max(col.g, col.b)), 0.0, 1.0);
	// Premultiplied additive light: the transparent host clears to nothing, so
	// the dim field (small col, small a) stays clear and only the flaring bolt
	// writes color over the caller's themed surface.
	gl_FragColor = vec4(col * a, a);
}
`;

export function LightningBackground({
	className,
	color = "var(--fr-accent)",
	xOffset = 0,
	speed = 1,
	intensity = 1,
	size = 1,
	fps,
	renderScale,
}: LightningBackgroundProps) {
	const [rgb] = useCssColors([color]);
	const uniforms = useMemo(
		() => ({
			uColor: rgb ?? [1, 1, 1],
			uXOffset: xOffset,
			uSpeed: speed,
			uIntensity: intensity,
			uSize: size,
		}),
		[rgb, xOffset, speed, intensity, size],
	);
	return (
		<ShaderBackground
			slot="lightning-background"
			className={className}
			fragment={FRAGMENT}
			uniforms={uniforms}
			fps={fps}
			renderScale={renderScale}
		/>
	);
}
