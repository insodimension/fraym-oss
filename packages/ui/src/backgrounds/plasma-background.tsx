/**
 * PlasmaBackground — a churning volumetric plasma cloud, a 60-step raymarch on
 * a fullscreen triangle. Fraym-native port of react-bits' "Plasma" (MIT,
 * https://reactbits.dev/backgrounds/plasma) on the shared {@link ShaderBackground}
 * host — ogl removed and the GLES3 source (`#version 300 es`, `in`/`out`,
 * `tanh`, `isnan`/`isinf`) down-leveled to GLSL ES 1.00: `tanh` reimplemented
 * from `exp`, the NaN/Inf guard rebuilt with the `(x < 0.0 || x >= 0.0)` trick
 * plus a magnitude clamp, and the `mat2(vec4)` rotor spelled out component-wise.
 * The JS-side "pingpong" time ramp is folded INTO the shader off `iTime`.
 *
 * Theme-native adaptation: the origin already derives its alpha from the field
 * luminance (`alpha = length(rgb) * uOpacity`), so it is near-additive already;
 * this port keeps that and premultiplies the color by alpha for the host's
 * premultiplied-alpha pipeline, so the plasma layers over the caller's
 * `bg-fr-bg` and reads on light AND dark. The tint defaults to the Fraym accent
 * token (the origin's `#ffffff` is not theme-aware); pass `color=""` to keep the
 * shader's raw multi-hue plasma instead of a single tint.
 *
 * Mouse interaction is OFF by default (backdrops); the origin defaulted it on.
 */

import { useMemo } from "react";
import { ShaderBackground, useCssColors } from "./shader-background";

/** Time direction for the plasma flow. */
export type PlasmaDirection = "forward" | "reverse" | "pingpong";

export interface PlasmaBackgroundProps {
	readonly className?: string;
	/** Plasma tint. CSS color, tokens welcome; `""` keeps the raw multi-hue plasma. Default the accent token. */
	readonly color?: string;
	/** Flow speed. Default 1. */
	readonly speed?: number;
	/** Flow direction: forward, reverse, or a smooth back-and-forth. Default "forward". */
	readonly direction?: PlasmaDirection;
	/** Zoom of the plasma field (larger = closer). Default 1. */
	readonly scale?: number;
	/** Overall opacity / light coverage. Default 1. */
	readonly opacity?: number;
	/** React to the pointer (subtle parallax warp). Default false (backdrops). */
	readonly mouseInteractive?: boolean;
	readonly fps?: number;
	/** Backing-store downsample. Default 0.7 — the 60-step raymarch is heavy and the field is soft. */
	readonly renderScale?: number;
}

const FRAGMENT = `
uniform vec2 iResolution;
uniform float iTime;
uniform vec3 uCustomColor;
uniform float uUseCustomColor;
uniform float uSpeed;
uniform float uDirection;
uniform float uPingpong;
uniform float uScale;
uniform float uOpacity;
uniform vec2 uMouse;
uniform float uMouseInteractive;

// GLSL ES 1.00 has no tanh: rebuild it from exp with a clamped argument so a
// runaway accumulation can never produce NaN/Inf here.
float tanh1(float x) {
	x = clamp(x, -20.0, 20.0);
	float e2 = exp(2.0 * x);
	return (e2 - 1.0) / (e2 + 1.0);
}

vec3 tanh3(vec3 v) {
	return vec3(tanh1(v.x), tanh1(v.y), tanh1(v.z));
}

// GLSL ES 1.00 has no isnan/isinf: (x < 0.0 || x >= 0.0) is false ONLY for NaN,
// and the magnitude clamp rejects Inf.
float finite1(float x) {
	return ((x < 0.0 || x >= 0.0) && abs(x) < 1e15) ? 1.0 : 0.0;
}

vec3 sanitize(vec3 c) {
	return vec3(
		finite1(c.r) > 0.5 ? c.r : 0.0,
		finite1(c.g) > 0.5 ? c.g : 0.0,
		finite1(c.b) > 0.5 ? c.b : 0.0
	);
}

// Origin drove pingpong from JS by remapping iTime to a smoothstep bounce; fold
// that back into the shader so the host's plain iTime is enough.
float plasmaTime() {
	if (uPingpong > 0.5) {
		float period = 10.0;
		float seg = mod(iTime, period);
		float u = seg / period;
		float sm = u * u * (3.0 - 2.0 * u);
		float forward = mod(floor(iTime / period), 2.0) < 0.5 ? 1.0 : 0.0;
		return mix((1.0 - sm) * period, sm * period, forward);
	}
	return iTime * uDirection;
}

void mainImage(out vec4 o, vec2 C) {
	vec2 center = iResolution.xy * 0.5;
	C = (C - center) / uScale + center;

	vec2 mouseOffset = (uMouse * iResolution.xy - center) * 0.0002;
	C += mouseOffset * length(C - center) * step(0.5, uMouseInteractive);

	float d = 0.0;
	float z = 0.0;
	float T = plasmaTime() * uSpeed;
	vec3 O = vec3(0.0);
	vec3 p;
	vec3 S;
	vec2 r = iResolution.xy;
	vec2 Q;
	o = vec4(0.0);

	for (int iter = 0; iter < 60; iter++) {
		p = z * normalize(vec3(C - 0.5 * r, r.y));
		p.z -= 4.0;
		S = p;
		d = p.y - T;
		p.x += 0.4 * (1.0 + p.y) * sin(d + p.x * 0.1) * cos(0.34 * d + p.x * 0.05);
		vec4 m = cos(p.y + vec4(0.0, 11.0, 33.0, 0.0) - T);
		mat2 rot = mat2(m.x, m.y, m.z, m.w);
		p.xz *= rot;
		Q = p.xz;
		d = abs(sqrt(length(Q * Q)) - 0.25 * (5.0 + S.y)) / 3.0 + 8e-4;
		z += d;
		o = 1.0 + sin(S.y + p.z * 0.5 + S.z - length(S - p) + vec4(2.0, 1.0, 0.0, 8.0));
		O += o.w / d * o.xyz;
	}

	o.xyz = tanh3(sanitize(O / 1e4));
}

void main() {
	vec4 o = vec4(0.0);
	mainImage(o, gl_FragCoord.xy);
	vec3 rgb = sanitize(o.rgb);

	float intensity = (rgb.r + rgb.g + rgb.b) / 3.0;
	vec3 customColor = intensity * uCustomColor;
	vec3 finalColor = mix(rgb, customColor, step(0.5, uUseCustomColor));

	float alpha = clamp(length(rgb) * uOpacity, 0.0, 1.0);
	gl_FragColor = vec4(finalColor * alpha, alpha);
}
`;

export function PlasmaBackground({
	className,
	color = "var(--fr-accent)",
	speed = 1,
	direction = "forward",
	scale = 1,
	opacity = 1,
	mouseInteractive = false,
	fps,
	renderScale = 0.7,
}: PlasmaBackgroundProps) {
	const [rgb] = useCssColors([color || "var(--fr-accent)"]);
	const uniforms = useMemo(
		() => ({
			uCustomColor: rgb ?? [1, 1, 1],
			uUseCustomColor: color ? 1 : 0,
			// Origin scaled the exposed speed by 0.4 before handing it to the shader.
			uSpeed: speed * 0.4,
			uDirection: direction === "reverse" ? -1 : 1,
			uPingpong: direction === "pingpong" ? 1 : 0,
			uScale: scale,
			uOpacity: opacity,
			uMouse: [0.5, 0.5],
			uMouseInteractive: mouseInteractive ? 1 : 0,
		}),
		[rgb, color, speed, direction, scale, opacity, mouseInteractive],
	);
	return (
		<ShaderBackground
			slot="plasma-background"
			className={className}
			fragment={FRAGMENT}
			uniforms={uniforms}
			mouseUniform={mouseInteractive ? "uMouse" : undefined}
			fps={fps}
			renderScale={renderScale}
		/>
	);
}
