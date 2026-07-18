/**
 * GalaxyBackground — a drifting, twinkling star field with layered parallax
 * depth. Fraym-native port of react-bits' "Galaxy" (MIT,
 * https://reactbits.dev/backgrounds/galaxy) on the shared
 * {@link ShaderBackground} host — ogl removed, the vec3 resolution collapsed to
 * the host's vec2 iResolution, the JS-side per-frame star drift folded INTO the
 * shader (derived from iTime), and the bool flags down-leveled to float flags.
 *
 * Theme-native: the star tint defaults to the Fraym accent token and may be ANY
 * CSS color including `var(--fr-*)`. Stars are grayscale at saturation 0 (so
 * they take the tint wholesale); raising saturation reintroduces per-star hue.
 * The output is additive light over transparency, so it reads on light and dark
 * surfaces alike. Mouse interaction is OFF by default (backdrops).
 */

import { useMemo } from "react";
import { ShaderBackground, useCssColors } from "./shader-background";

export interface GalaxyBackgroundProps {
	readonly className?: string;
	/** Star tint. CSS color, tokens welcome. Default the accent token. */
	readonly color?: string;
	/** Field center as a viewport fraction [x, y]. Default [0.5, 0.5]. */
	readonly focal?: readonly [number, number];
	/** Static orientation as (cos, sin). Default [1, 0] (upright). */
	readonly rotation?: readonly [number, number];
	/** Star drift speed through the layers. Default 0.5. */
	readonly starSpeed?: number;
	/** Star field density. Default 1. */
	readonly density?: number;
	/** Hue rotation in degrees (needs saturation > 0 to show). Default 140. */
	readonly hueShift?: number;
	/** Twinkle and wander animation speed. Default 1. */
	readonly speed?: number;
	/** Star glow radius and flare intensity. Default 0.3. */
	readonly glowIntensity?: number;
	/** Per-star color saturation (0 tinted mono .. 1 full hue). Default 0. */
	readonly saturation?: number;
	/** Twinkle strength (0 steady .. 1 full). Default 0.3. */
	readonly twinkleIntensity?: number;
	/** Auto-rotation speed of the whole field. Default 0.1. */
	readonly rotationSpeed?: number;
	/** Continuous outward push from the center (0 off). Default 0. */
	readonly autoCenterRepulsion?: number;
	/** React to the pointer. Default false (backdrops). */
	readonly followMouse?: boolean;
	/** When following, push stars from the pointer instead of nudging with it. Default true. */
	readonly mouseRepulsion?: boolean;
	/** Pointer repulsion strength. Default 2. */
	readonly repulsionStrength?: number;
	/** Overall light intensity. Default 1. */
	readonly intensity?: number;
	readonly fps?: number;
	readonly renderScale?: number;
}

const FRAGMENT = `
uniform vec2 iResolution;
uniform float iTime;
uniform vec2 iMouse;
uniform vec2 uFocal;
uniform vec2 uRotation;
uniform float uStarSpeed;
uniform float uDensity;
uniform float uHueShift;
uniform float uSpeed;
uniform float uGlowIntensity;
uniform float uSaturation;
uniform float uMouseRepulsion;
uniform float uTwinkleIntensity;
uniform float uRotationSpeed;
uniform float uRepulsionStrength;
uniform float uMouseActiveFactor;
uniform float uAutoCenterRepulsion;
uniform vec3 uColor;
uniform float uIntensity;

varying vec2 vUv;

#define NUM_LAYER 4.0
#define STAR_COLOR_CUTOFF 0.2
#define MAT45 mat2(0.7071, -0.7071, 0.7071, 0.7071)
#define PERIOD 3.0

float Hash21(vec2 p) {
	p = fract(p * vec2(123.34, 456.21));
	p += dot(p, p + 45.32);
	return fract(p.x * p.y);
}

float tri(float x) {
	return abs(fract(x) * 2.0 - 1.0);
}

float tris(float x) {
	float t = fract(x);
	return 1.0 - smoothstep(0.0, 1.0, abs(2.0 * t - 1.0));
}

float trisn(float x) {
	float t = fract(x);
	return 2.0 * (1.0 - smoothstep(0.0, 1.0, abs(2.0 * t - 1.0))) - 1.0;
}

vec3 hsv2rgb(vec3 c) {
	vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
	vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
	return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

float Star(vec2 uv, float flare) {
	float d = length(uv);
	float m = (0.05 * uGlowIntensity) / d;
	float rays = smoothstep(0.0, 1.0, 1.0 - abs(uv.x * uv.y * 1000.0));
	m += rays * flare * uGlowIntensity;
	uv *= MAT45;
	rays = smoothstep(0.0, 1.0, 1.0 - abs(uv.x * uv.y * 1000.0));
	m += rays * 0.3 * flare * uGlowIntensity;
	m *= smoothstep(1.0, 0.2, d);
	return m;
}

vec3 StarLayer(vec2 uv, float starSpeed) {
	vec3 col = vec3(0.0);

	vec2 gv = fract(uv) - 0.5;
	vec2 id = floor(uv);

	for (int y = -1; y <= 1; y++) {
		for (int x = -1; x <= 1; x++) {
			vec2 offset = vec2(float(x), float(y));
			vec2 si = id + vec2(float(x), float(y));
			float seed = Hash21(si);
			float size = fract(seed * 345.32);
			float glossLocal = tri(starSpeed / (PERIOD * seed + 1.0));
			float flareSize = smoothstep(0.9, 1.0, size) * glossLocal;

			float red = smoothstep(STAR_COLOR_CUTOFF, 1.0, Hash21(si + 1.0)) + STAR_COLOR_CUTOFF;
			float blu = smoothstep(STAR_COLOR_CUTOFF, 1.0, Hash21(si + 3.0)) + STAR_COLOR_CUTOFF;
			float grn = min(red, blu) * seed;
			vec3 base = vec3(red, grn, blu);

			float hue = atan(base.g - base.r, base.b - base.r) / (2.0 * 3.14159) + 0.5;
			hue = fract(hue + uHueShift / 360.0);
			float sat = length(base - vec3(dot(base, vec3(0.299, 0.587, 0.114)))) * uSaturation;
			float val = max(max(base.r, base.g), base.b);
			base = hsv2rgb(vec3(hue, sat, val));

			vec2 pad = vec2(tris(seed * 34.0 + iTime * uSpeed / 10.0), tris(seed * 38.0 + iTime * uSpeed / 30.0)) - 0.5;

			float star = Star(gv - offset - pad, flareSize);
			vec3 color = base;

			float twinkle = trisn(iTime * uSpeed + seed * 6.2831) * 0.5 + 1.0;
			twinkle = mix(1.0, twinkle, uTwinkleIntensity);
			star *= twinkle;

			col += star * size * color;
		}
	}

	return col;
}

void main() {
	vec2 focalPx = uFocal * iResolution;
	vec2 uv = (vUv * iResolution - focalPx) / iResolution.y;

	// Star drift derived from iTime — the source updated this JS-side per frame.
	float starSpeed = (iTime * uStarSpeed) / 10.0;

	vec2 mouseNorm = iMouse - vec2(0.5);

	if (uAutoCenterRepulsion > 0.0) {
		vec2 centerUV = vec2(0.0, 0.0);
		float centerDist = length(uv - centerUV);
		vec2 repulsion = normalize(uv - centerUV) * (uAutoCenterRepulsion / (centerDist + 0.1));
		uv += repulsion * 0.05;
	} else if (uMouseRepulsion > 0.5) {
		vec2 mousePosUV = (iMouse * iResolution - focalPx) / iResolution.y;
		float mouseDist = length(uv - mousePosUV);
		vec2 repulsion = normalize(uv - mousePosUV) * (uRepulsionStrength / (mouseDist + 0.1));
		uv += repulsion * 0.05 * uMouseActiveFactor;
	} else {
		vec2 mouseOffset = mouseNorm * 0.1 * uMouseActiveFactor;
		uv += mouseOffset;
	}

	float autoRotAngle = iTime * uRotationSpeed;
	mat2 autoRot = mat2(cos(autoRotAngle), -sin(autoRotAngle), sin(autoRotAngle), cos(autoRotAngle));
	uv = autoRot * uv;

	uv = mat2(uRotation.x, -uRotation.y, uRotation.y, uRotation.x) * uv;

	vec3 col = vec3(0.0);

	for (float i = 0.0; i < 1.0; i += 1.0 / NUM_LAYER) {
		float depth = fract(i + starSpeed * uSpeed);
		float scale = mix(20.0 * uDensity, 0.5 * uDensity, depth);
		float fade = depth * smoothstep(1.0, 0.9, depth);
		col += StarLayer(uv * scale + i * 453.32, starSpeed) * fade;
	}

	// Coverage from the raw star luminance keeps the alpha shape tint-independent;
	// the visible color rides the theme tint and intensity. Premultiplied over
	// transparent so the field is additive light.
	vec3 tinted = col * uColor * uIntensity;
	float alpha = min(smoothstep(0.0, 0.3, length(col)), 1.0);
	gl_FragColor = vec4(tinted * alpha, alpha);
}
`;

export function GalaxyBackground({
	className,
	color = "var(--fr-accent)",
	focal = [0.5, 0.5],
	rotation = [1, 0],
	starSpeed = 0.5,
	density = 1,
	hueShift = 140,
	speed = 1,
	glowIntensity = 0.3,
	saturation = 0,
	twinkleIntensity = 0.3,
	rotationSpeed = 0.1,
	autoCenterRepulsion = 0,
	followMouse = false,
	mouseRepulsion = true,
	repulsionStrength = 2,
	intensity = 1,
	fps,
	renderScale,
}: GalaxyBackgroundProps) {
	const [rgb] = useCssColors([color]);
	const uniforms = useMemo(
		() => ({
			uColor: rgb ?? [1, 1, 1],
			uFocal: focal,
			uRotation: rotation,
			uStarSpeed: starSpeed,
			uDensity: density,
			uHueShift: hueShift,
			uSpeed: speed,
			uGlowIntensity: glowIntensity,
			uSaturation: saturation,
			uTwinkleIntensity: twinkleIntensity,
			uRotationSpeed: rotationSpeed,
			uAutoCenterRepulsion: autoCenterRepulsion,
			iMouse: [0.5, 0.5],
			uMouseRepulsion: mouseRepulsion ? 1 : 0,
			uRepulsionStrength: repulsionStrength,
			uMouseActiveFactor: followMouse ? 1 : 0,
			uIntensity: intensity,
		}),
		[
			rgb,
			focal,
			rotation,
			starSpeed,
			density,
			hueShift,
			speed,
			glowIntensity,
			saturation,
			twinkleIntensity,
			rotationSpeed,
			autoCenterRepulsion,
			mouseRepulsion,
			repulsionStrength,
			followMouse,
			intensity,
		],
	);
	return (
		<ShaderBackground
			slot="galaxy-background"
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
