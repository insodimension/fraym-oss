/**
 * LightRaysBackground — volumetric god rays fanning from an edge anchor.
 * Fraym-native port of react-bits' "LightRays" (MIT,
 * https://reactbits.dev/backgrounds/light-rays) on the shared
 * {@link ShaderBackground} host — ogl removed, and the JS-side anchor
 * placement moved INTO the shader (anchor as a resolution-independent
 * fraction), so resizes never desync the origin.
 *
 * Theme-native: the ray color defaults to the Fraym accent token; additive
 * light over transparency reads on light and dark surfaces alike.
 */

import { useMemo } from "react";
import { ShaderBackground, useCssColors } from "./shader-background";

export type LightRaysOrigin =
	| "top-center"
	| "top-left"
	| "top-right"
	| "left"
	| "right"
	| "bottom-left"
	| "bottom-center"
	| "bottom-right";

export interface LightRaysBackgroundProps {
	readonly className?: string;
	/** Edge the light pours from. Default "top-center". */
	readonly raysOrigin?: LightRaysOrigin;
	/** Ray color. CSS color, tokens welcome. Default the accent token. */
	readonly raysColor?: string;
	/** Animation speed. Default 1. */
	readonly raysSpeed?: number;
	/** Cone width (higher = wider). Default 1. */
	readonly lightSpread?: number;
	/** Reach as a fraction of the viewport. Default 2. */
	readonly rayLength?: number;
	/** Slow breathing signal. Default false. */
	readonly pulsating?: boolean;
	/** Fade-out distance factor. Default 1. */
	readonly fadeDistance?: number;
	/** Color saturation (0 gray .. 1 full). Default 1. */
	readonly saturation?: number;
	/** Bend rays toward the pointer. Default false (backdrops). */
	readonly followMouse?: boolean;
	/** Pointer bend strength (0..1). Default 0.1. */
	readonly mouseInfluence?: number;
	/** Film grain over the rays (0..1). Default 0. */
	readonly noiseAmount?: number;
	/** Wavy angular distortion (0..1). Default 0. */
	readonly distortion?: number;
	/** Overall light intensity. Default 1. */
	readonly intensity?: number;
	readonly fps?: number;
	readonly renderScale?: number;
}

/** Anchor fraction (of the viewport, y-down) + ray direction per origin —
 *  the source's getAnchorAndDir, made resolution-independent. */
const ORIGINS: Record<
	LightRaysOrigin,
	{ readonly anchor: readonly [number, number]; readonly dir: readonly [number, number] }
> = {
	"top-left": { anchor: [0, -0.2], dir: [0, 1] },
	"top-center": { anchor: [0.5, -0.2], dir: [0, 1] },
	"top-right": { anchor: [1, -0.2], dir: [0, 1] },
	left: { anchor: [-0.2, 0.5], dir: [1, 0] },
	right: { anchor: [1.2, 0.5], dir: [-1, 0] },
	"bottom-left": { anchor: [0, 1.2], dir: [0, -1] },
	"bottom-center": { anchor: [0.5, 1.2], dir: [0, -1] },
	"bottom-right": { anchor: [1, 1.2], dir: [0, -1] },
};

const FRAGMENT = `
uniform vec2 iResolution;
uniform float iTime;
uniform vec2 iMouse;

uniform vec2 uAnchorFrac;
uniform vec2 uRayDir;
uniform vec3 uRaysColor;
uniform float uRaysSpeed;
uniform float uLightSpread;
uniform float uRayLength;
uniform float uPulsating;
uniform float uFadeDistance;
uniform float uSaturation;
uniform float uMouseInfluence;
uniform float uNoiseAmount;
uniform float uDistortion;
uniform float uIntensity;

float noise(vec2 st) {
	return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

float rayStrength(vec2 raySource, vec2 rayRefDirection, vec2 coord, float seedA, float seedB, float speed) {
	vec2 sourceToCoord = coord - raySource;
	vec2 dirNorm = normalize(sourceToCoord);
	float cosAngle = dot(dirNorm, rayRefDirection);

	float distortedAngle = cosAngle + uDistortion * sin(iTime * 2.0 + length(sourceToCoord) * 0.01) * 0.2;
	float spreadFactor = pow(max(distortedAngle, 0.0), 1.0 / max(uLightSpread, 0.001));

	float dist = length(sourceToCoord);
	float maxDistance = iResolution.x * uRayLength;
	float lengthFalloff = clamp((maxDistance - dist) / maxDistance, 0.0, 1.0);
	float fadeFalloff = clamp((iResolution.x * uFadeDistance - dist) / (iResolution.x * uFadeDistance), 0.5, 1.0);
	float signal = uPulsating > 0.5 ? (0.8 + 0.2 * sin(iTime * speed * 3.0)) : 1.0;

	float baseStrength = clamp(
		(0.45 + 0.15 * sin(distortedAngle * seedA + iTime * speed)) +
		(0.3 + 0.2 * cos(-distortedAngle * seedB + iTime * speed)),
		0.0, 1.0
	);

	return baseStrength * lengthFalloff * fadeFalloff * spreadFactor * signal;
}

void main() {
	// The source's anchors live in y-DOWN screen space; flip once here.
	vec2 coord = vec2(gl_FragCoord.x, iResolution.y - gl_FragCoord.y);
	vec2 rayPos = uAnchorFrac * iResolution;

	vec2 finalRayDir = uRayDir;
	if (uMouseInfluence > 0.0) {
		vec2 mouseScreenPos = vec2(iMouse.x, 1.0 - iMouse.y) * iResolution;
		vec2 mouseDirection = normalize(mouseScreenPos - rayPos);
		finalRayDir = normalize(mix(uRayDir, mouseDirection, uMouseInfluence));
	}

	float rays1 = rayStrength(rayPos, finalRayDir, coord, 36.2214, 21.11349, 1.5 * uRaysSpeed);
	float rays2 = rayStrength(rayPos, finalRayDir, coord, 22.3991, 18.0234, 1.1 * uRaysSpeed);
	vec3 col = vec3(rays1 * 0.5 + rays2 * 0.4);

	if (uNoiseAmount > 0.0) {
		float n = noise(coord * 0.01 + iTime * 0.1);
		col *= (1.0 - uNoiseAmount + uNoiseAmount * n);
	}

	float brightness = 1.0 - (coord.y / iResolution.y);
	col.x *= 0.1 + brightness * 0.8;
	col.y *= 0.3 + brightness * 0.6;
	col.z *= 0.5 + brightness * 0.5;

	if (uSaturation != 1.0) {
		float gray = dot(col, vec3(0.299, 0.587, 0.114));
		col = mix(vec3(gray), col, uSaturation);
	}

	col *= uRaysColor * uIntensity;
	float alpha = clamp(max(col.r, max(col.g, col.b)), 0.0, 1.0);
	gl_FragColor = vec4(col * alpha, alpha);
}
`;

export function LightRaysBackground({
	className,
	raysOrigin = "top-center",
	raysColor = "var(--fr-accent)",
	raysSpeed = 1,
	lightSpread = 1,
	rayLength = 2,
	pulsating = false,
	fadeDistance = 1,
	saturation = 1,
	followMouse = false,
	mouseInfluence = 0.1,
	noiseAmount = 0,
	distortion = 0,
	intensity = 1,
	fps,
	renderScale,
}: LightRaysBackgroundProps) {
	const [rgb] = useCssColors([raysColor]);
	const uniforms = useMemo(() => {
		const origin = ORIGINS[raysOrigin];
		return {
			uAnchorFrac: origin.anchor,
			uRayDir: origin.dir,
			uRaysColor: rgb ?? [1, 1, 1],
			uRaysSpeed: raysSpeed,
			uLightSpread: lightSpread,
			uRayLength: rayLength,
			uPulsating: pulsating ? 1 : 0,
			uFadeDistance: fadeDistance,
			uSaturation: saturation,
			iMouse: [0.5, 0.5],
			uMouseInfluence: followMouse ? mouseInfluence : 0,
			uNoiseAmount: noiseAmount,
			uDistortion: distortion,
			uIntensity: intensity,
		};
	}, [
		raysOrigin,
		rgb,
		raysSpeed,
		lightSpread,
		rayLength,
		pulsating,
		fadeDistance,
		saturation,
		followMouse,
		mouseInfluence,
		noiseAmount,
		distortion,
		intensity,
	]);
	return (
		<ShaderBackground
			slot="light-rays-background"
			className={className}
			fragment={FRAGMENT}
			uniforms={uniforms}
			mouseUniform={followMouse ? "iMouse" : undefined}
			mouseSmoothing={0.08}
			fps={fps}
			renderScale={renderScale}
		/>
	);
}
