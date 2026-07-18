/**
 * ParticlesBackground — a field of soft, drifting dots with parallax depth.
 * Fraym-native port of react-bits' "Particles" (MIT,
 * https://reactbits.dev/backgrounds/particles). The origin is a real 3D point
 * cloud (ogl: a unit-ball of vertices, a perspective camera, gl_PointSize
 * attenuation). We re-author it PURELY in the fragment shader as a screen-space
 * pseudo-3D field, reusing the galaxy port's star-field math: particles are
 * hash-distributed into grid cells, each drifts with a per-particle sinusoidal
 * wobble, and several depth-cycling layers give parallax plus size attenuation
 * (near = larger and brighter, far = smaller and fainter) — the same look of
 * softly drifting dots, with none of the geometry, camera, or ogl.
 *
 * Theme-native: coverage is tint-independent, so the visible color rides the
 * `color` token (default the accent) with a faint chroma shimmer echoing the
 * origin's per-particle color wobble; output is premultiplied light over a
 * transparent canvas, so it reads on light AND dark surfaces alike. Pointer
 * parallax is OFF by default (backdrops); `followMouse` wires it to the host.
 */

import { useMemo } from "react";
import { ShaderBackground, useCssColors } from "./shader-background";

export interface ParticlesBackgroundProps {
	readonly className?: string;
	/** Particle tint. CSS color, tokens welcome. Default the accent token. */
	readonly color?: string;
	/** Field density — higher packs more dots per layer. Default 1. */
	readonly density?: number;
	/** Drift and wobble speed. Default 1. */
	readonly speed?: number;
	/** Base dot radius multiplier. Default 1. */
	readonly size?: number;
	/** Soft translucent dots (true) vs crisp bright dots (false). Default false. */
	readonly alphaParticles?: boolean;
	/** React to the pointer: the field parallaxes with it. Default false (backdrops). */
	readonly followMouse?: boolean;
	/** Overall light intensity. Default 1. */
	readonly intensity?: number;
	readonly fps?: number;
	readonly renderScale?: number;
}

const FRAGMENT = `
uniform vec2 iResolution;
uniform float iTime;
uniform vec2 iMouse;
uniform vec3 uColor;
uniform float uDensity;
uniform float uSpeed;
uniform float uSize;
uniform float uAlpha;
uniform float uFollowMouse;
uniform float uIntensity;

varying vec2 vUv;

#define LAYERS 3

float hash21(vec2 p) {
	p = fract(p * vec2(123.34, 456.21));
	p += dot(p, p + 45.32);
	return fract(p.x * p.y);
}

// One depth slice of drifting soft dots on a hashed grid. \`depth\` scales the
// dot radius (near = larger) for size attenuation; \`fill\` gates which cells
// carry a dot so the field reads as sparse particles, not a dense sheet.
float dotLayer(vec2 uv, float t, float depth, float fill) {
	vec2 gv = fract(uv) - 0.5;
	vec2 id = floor(uv);
	float m = 0.0;
	for (int y = -1; y <= 1; y++) {
		for (int x = -1; x <= 1; x++) {
			vec2 offset = vec2(float(x), float(y));
			vec2 cid = id + offset;
			float seed = hash21(cid);
			if (seed > fill) continue;
			vec2 pos = vec2(hash21(cid + 1.7), hash21(cid + 9.1)) - 0.5;
			// per-particle wobble — the origin's sin(t * random) drift
			pos += 0.30 * vec2(
				sin(t * (0.4 + 0.6 * seed) + seed * 6.2831),
				cos(t * (0.3 + 0.5 * seed) + seed * 4.1888)
			);
			float d = length(gv - offset - pos);
			float radius = 0.05 * uSize * mix(0.6, 1.4, hash21(cid + 3.3)) * depth;
			float inner = radius * mix(0.15, 0.55, uAlpha);
			float glow = 1.0 - smoothstep(inner, radius, d);
			m += glow * mix(1.0, 0.75, uAlpha);
		}
	}
	return m;
}

void main() {
	float aspect = iResolution.x / iResolution.y;
	vec2 uv = (vUv - 0.5) * vec2(aspect, 1.0);

	// Optional pointer parallax (the origin's moveParticlesOnHover), gated off.
	uv += (iMouse - 0.5) * 0.15 * uFollowMouse;

	float t = iTime * uSpeed;
	float fill = clamp(0.35 * uDensity, 0.05, 1.0);

	float col = 0.0;
	for (int i = 0; i < LAYERS; i++) {
		float fi = float(i);
		// A slow depth cycle drives parallax + attenuation: dots emerge small
		// and faint at the far plane, brighten mid-field, and fade at the near.
		float depth = fract(fi / float(LAYERS) + t * 0.02);
		float scale = mix(3.0, 9.0, depth) * (0.6 + 0.4 * uDensity);
		float fade = depth * (1.0 - smoothstep(0.85, 1.0, depth));
		vec2 luv = uv * scale + fi * 71.3;
		// Nearer layers drift a touch faster for depth.
		luv += vec2(t * 0.03 * (1.0 + fi), t * 0.017 * (1.0 + fi));
		col += dotLayer(luv, t, depth, fill) * fade;
	}

	// Coverage is tint-independent (galaxy-port precedent); the color rides the
	// token plus a faint chroma shimmer for the origin's per-particle wobble.
	vec3 chroma = 1.0 + 0.12 * sin(vec3(0.0, 2.09, 4.18) + t * 0.5 + vUv.yxy * 8.0);
	vec3 tinted = col * uColor * chroma * uIntensity;
	float alpha = min(smoothstep(0.0, 0.25, col), 1.0);
	gl_FragColor = vec4(tinted * alpha, alpha);
}
`;

export function ParticlesBackground({
	className,
	color = "var(--fr-accent)",
	density = 1,
	speed = 1,
	size = 1,
	alphaParticles = false,
	followMouse = false,
	intensity = 1,
	fps,
	renderScale,
}: ParticlesBackgroundProps) {
	const [rgb] = useCssColors([color]);
	const uniforms = useMemo(
		() => ({
			uColor: rgb ?? [1, 1, 1],
			uDensity: density,
			uSpeed: speed,
			uSize: size,
			uAlpha: alphaParticles ? 1 : 0,
			uFollowMouse: followMouse ? 1 : 0,
			uIntensity: intensity,
			iMouse: [0.5, 0.5],
		}),
		[rgb, density, speed, size, alphaParticles, followMouse, intensity],
	);
	return (
		<ShaderBackground
			slot="particles-background"
			className={className}
			fragment={FRAGMENT}
			uniforms={uniforms}
			mouseUniform={followMouse ? "iMouse" : undefined}
			mouseSmoothing={0.06}
			fps={fps}
			renderScale={renderScale}
		/>
	);
}
