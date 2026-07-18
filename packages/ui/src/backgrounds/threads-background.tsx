/**
 * ThreadsBackground — a bundle of soft, drifting light filaments that fan out
 * across the surface, each warped by its own slice of Perlin noise. Fraym-native
 * port of react-bits' "Threads" (MIT, https://reactbits.dev/backgrounds/threads)
 * on the shared {@link ShaderBackground} host — ogl removed, the origin's vec3
 * `iResolution` collapsed to the host's vec2, and the JS-side mouse ref folded
 * into the host's smoothed pointer uniform.
 *
 * Theme-native: the origin drew white threads on a dark field; here the thread
 * tint defaults to the Fraym accent token (white is invisible on a light
 * surface) and the output is premultiplied additive light over a transparent
 * canvas — the empty field stays clear, only the filaments paint, so it reads on
 * light AND dark. Mouse interaction is OFF by default (backdrops).
 */

import { useMemo } from "react";
import { ShaderBackground, useCssColors } from "./shader-background";

export interface ThreadsBackgroundProps {
	readonly className?: string;
	/** Thread tint. CSS color, tokens welcome. Default the accent token. */
	readonly color?: string;
	/** Noise-driven waviness of each filament. Default 1. */
	readonly amplitude?: number;
	/** Vertical fan-out spread between the filaments (0 tight .. 1 wide). Default 0. */
	readonly distance?: number;
	/** Overall light intensity. Default 1. */
	readonly intensity?: number;
	/** React to the pointer (nudges wave phase and amplitude). Default false. */
	readonly followMouse?: boolean;
	readonly fps?: number;
	readonly renderScale?: number;
}

const FRAGMENT = `
uniform vec2 iResolution;
uniform float iTime;
uniform vec3 uColor;
uniform float uAmplitude;
uniform float uDistance;
uniform vec2 iMouse;
uniform float uIntensity;

#define PI 3.1415926538

const int u_line_count = 40;
const float u_line_width = 7.0;
const float u_line_blur = 10.0;

float Perlin2D(vec2 P) {
	vec2 Pi = floor(P);
	vec4 Pf_Pfmin1 = P.xyxy - vec4(Pi, Pi + 1.0);
	vec4 Pt = vec4(Pi.xy, Pi.xy + 1.0);
	Pt = Pt - floor(Pt * (1.0 / 71.0)) * 71.0;
	Pt += vec2(26.0, 161.0).xyxy;
	Pt *= Pt;
	Pt = Pt.xzxz * Pt.yyww;
	vec4 hash_x = fract(Pt * (1.0 / 951.135664));
	vec4 hash_y = fract(Pt * (1.0 / 642.949883));
	vec4 grad_x = hash_x - 0.49999;
	vec4 grad_y = hash_y - 0.49999;
	vec4 grad_results = inversesqrt(grad_x * grad_x + grad_y * grad_y)
		* (grad_x * Pf_Pfmin1.xzxz + grad_y * Pf_Pfmin1.yyww);
	grad_results *= 1.4142135623730950;
	vec2 blend = Pf_Pfmin1.xy * Pf_Pfmin1.xy * Pf_Pfmin1.xy
		* (Pf_Pfmin1.xy * (Pf_Pfmin1.xy * 6.0 - 15.0) + 10.0);
	vec4 blend2 = vec4(blend, vec2(1.0 - blend));
	return dot(grad_results, blend2.zxzx * blend2.wwyy);
}

float pixel(float count, vec2 resolution) {
	return (1.0 / max(resolution.x, resolution.y)) * count;
}

float lineFn(vec2 st, float width, float perc, vec2 mouse, float time, float amplitude, float distance) {
	float split_offset = (perc * 0.4);
	float split_point = 0.1 + split_offset;

	float amplitude_normal = smoothstep(split_point, 0.7, st.x);
	float amplitude_strength = 0.5;
	float finalAmplitude = amplitude_normal * amplitude_strength
		* amplitude * (1.0 + (mouse.y - 0.5) * 0.2);

	float time_scaled = time / 10.0 + (mouse.x - 0.5) * 1.0;
	float blur = smoothstep(split_point, split_point + 0.05, st.x) * perc;

	float xnoise = mix(
		Perlin2D(vec2(time_scaled, st.x + perc) * 2.5),
		Perlin2D(vec2(time_scaled, st.x + time_scaled) * 3.5) / 1.5,
		st.x * 0.3
	);

	float y = 0.5 + (perc - 0.5) * distance + xnoise / 2.0 * finalAmplitude;

	float line_start = smoothstep(
		y + (width / 2.0) + (u_line_blur * pixel(1.0, iResolution) * blur),
		y,
		st.y
	);

	float line_end = smoothstep(
		y,
		y - (width / 2.0) - (u_line_blur * pixel(1.0, iResolution) * blur),
		st.y
	);

	return clamp(
		(line_start - line_end) * (1.0 - smoothstep(0.0, 1.0, pow(perc, 0.3))),
		0.0,
		1.0
	);
}

void main() {
	vec2 uv = gl_FragCoord.xy / iResolution;

	float line_strength = 1.0;
	for (int i = 0; i < u_line_count; i++) {
		float p = float(i) / float(u_line_count);
		line_strength *= (1.0 - lineFn(
			uv,
			u_line_width * pixel(1.0, iResolution) * (1.0 - p),
			p,
			iMouse,
			iTime,
			uAmplitude,
			uDistance
		));
	}

	// colorVal is the accumulated filament ink: ~0 in empty space, high on a
	// thread. It doubles as coverage so the field is additive light — clear
	// where there are no threads, tinted where they pass. Premultiplied for the
	// host's ONE / ONE_MINUS_SRC_ALPHA blend.
	float colorVal = 1.0 - line_strength;
	gl_FragColor = vec4(uColor * colorVal * uIntensity, colorVal);
}
`;

export function ThreadsBackground({
	className,
	color = "var(--fr-accent)",
	amplitude = 1,
	distance = 0,
	intensity = 1,
	followMouse = false,
	fps,
	renderScale,
}: ThreadsBackgroundProps) {
	const [rgb] = useCssColors([color]);
	const uniforms = useMemo(
		() => ({
			uColor: rgb ?? [1, 1, 1],
			uAmplitude: amplitude,
			uDistance: distance,
			uIntensity: intensity,
			iMouse: [0.5, 0.5],
		}),
		[rgb, amplitude, distance, intensity],
	);
	return (
		<ShaderBackground
			slot="threads-background"
			className={className}
			fragment={FRAGMENT}
			uniforms={uniforms}
			mouseUniform={followMouse ? "iMouse" : undefined}
			mouseSmoothing={0.05}
			fps={fps}
			renderScale={renderScale}
		/>
	);
}
