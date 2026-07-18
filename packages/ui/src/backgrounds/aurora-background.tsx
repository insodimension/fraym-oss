/**
 * AuroraBackground — the classic aurora curtain: a simplex-noise ridge of
 * light sweeping across a three-stop color ramp. Fraym-native port of
 * react-bits' "Aurora" (MIT, https://reactbits.dev/backgrounds/aurora) on the
 * shared {@link ShaderBackground} host — ogl removed, GLES3 source down-leveled
 * to ES 1.00, the color-stop array flattened to three vec3 uniforms.
 *
 * Theme-native: colors default to the Fraym accent tokens and may be ANY CSS
 * color including `var(--fr-*)` (resolved in-tree, retinted on theme swaps);
 * the output is additive light over a transparent canvas, so it reads on
 * light and dark surfaces alike.
 */

import { useMemo } from "react";
import { ShaderBackground, useCssColors } from "./shader-background";

export interface AuroraBackgroundProps {
	readonly className?: string;
	/** Three ramp stops, left → right. CSS colors, tokens welcome. */
	readonly colorStops?: readonly [string, string, string];
	/** Ridge height multiplier. Default 1. */
	readonly amplitude?: number;
	/** Edge softness of the curtain (0 hard .. 1 soft). Default 0.5. */
	readonly blend?: number;
	/** Animation speed multiplier. Default 1. */
	readonly speed?: number;
	/** Overall light intensity. Default 1. */
	readonly intensity?: number;
	readonly fps?: number;
	readonly renderScale?: number;
}

const FRAGMENT = `
uniform vec2 iResolution;
uniform float iTime;
uniform float uSpeed;
uniform float uAmplitude;
uniform float uBlend;
uniform float uIntensity;
uniform vec3 uColorStop0;
uniform vec3 uColorStop1;
uniform vec3 uColorStop2;

vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }

float snoise(vec2 v) {
	const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
	vec2 i = floor(v + dot(v, C.yy));
	vec2 x0 = v - i + dot(i, C.xx);
	vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
	vec4 x12 = x0.xyxy + C.xxzz;
	x12.xy -= i1;
	i = mod(i, 289.0);
	vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
	vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
	m = m * m;
	m = m * m;
	vec3 x = 2.0 * fract(p * C.www) - 1.0;
	vec3 h = abs(x) - 0.5;
	vec3 ox = floor(x + 0.5);
	vec3 a0 = x - ox;
	m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
	vec3 g;
	g.x = a0.x * x0.x + h.x * x0.y;
	g.yz = a0.yz * x12.xz + h.yz * x12.yw;
	return 130.0 * dot(m, g);
}

vec3 ramp(float factor) {
	vec3 lower = mix(uColorStop0, uColorStop1, clamp(factor / 0.5, 0.0, 1.0));
	return mix(lower, uColorStop2, clamp((factor - 0.5) / 0.5, 0.0, 1.0));
}

void main() {
	vec2 uv = gl_FragCoord.xy / iResolution;
	float t = iTime * uSpeed;

	vec3 rampColor = ramp(uv.x);

	float height = snoise(vec2(uv.x * 2.0 + t * 0.1, t * 0.25)) * 0.5 * uAmplitude;
	height = exp(height);
	height = (uv.y * 2.0 - height + 0.2);
	float lum = 0.6 * height;

	float midPoint = 0.20;
	float auroraAlpha = smoothstep(midPoint - uBlend * 0.5, midPoint + uBlend * 0.5, lum);

	vec3 auroraColor = lum * rampColor * uIntensity;
	gl_FragColor = vec4(auroraColor * auroraAlpha, auroraAlpha);
}
`;

export function AuroraBackground({
	className,
	colorStops = ["var(--fr-accent)", "var(--fr-iris)", "var(--fr-accent)"],
	amplitude = 1,
	blend = 0.5,
	speed = 1,
	intensity = 1,
	fps,
	renderScale,
}: AuroraBackgroundProps) {
	const [stop0, stop1, stop2] = useCssColors(colorStops);
	const uniforms = useMemo(
		() => ({
			uSpeed: speed,
			uAmplitude: amplitude,
			uBlend: blend,
			uIntensity: intensity,
			uColorStop0: stop0 ?? [1, 1, 1],
			uColorStop1: stop1 ?? [1, 1, 1],
			uColorStop2: stop2 ?? [1, 1, 1],
		}),
		[speed, amplitude, blend, intensity, stop0, stop1, stop2],
	);
	return (
		<ShaderBackground
			slot="aurora-background"
			className={className}
			fragment={FRAGMENT}
			uniforms={uniforms}
			fps={fps}
			renderScale={renderScale}
		/>
	);
}
