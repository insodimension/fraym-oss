/**
 * RippleGridBackground — a perspective grid of glowing lines that breathes with
 * a radial sine ripple from the center, with an optional rainbow sweep. Fraym-
 * native port of react-bits' "RippleGrid" (MIT,
 * https://reactbits.dev/backgrounds/ripple-grid) on the shared
 * {@link ShaderBackground} host — ogl removed, the `bool` uniforms down-leveled
 * to float flags, and the JS-side mouse lerp/influence ramp folded into the
 * host's smoothed pointer uniform.
 *
 * Theme-native: the origin default grid color was `#ffffff` (invisible on a
 * light surface); here it defaults to the Fraym accent token. The output is
 * already coverage-shaped (alpha follows the line brightness through a distance
 * fade and vignette), so retinting it and premultiplying for the host's blend
 * yields additive light that reads on light AND dark. Mouse interaction is OFF
 * by default (backdrops).
 */

import { useMemo } from "react";
import { ShaderBackground, useCssColors } from "./shader-background";

export interface RippleGridBackgroundProps {
	readonly className?: string;
	/** Grid line tint (ignored when `rainbow`). CSS color, tokens welcome. Default the accent token. */
	readonly gridColor?: string;
	/** Cycle the grid through a hue sweep instead of `gridColor`. Default false. */
	readonly rainbow?: boolean;
	/** Radial ripple displacement strength. Default 0.05. */
	readonly rippleIntensity?: number;
	/** Number of grid cells across (higher = finer grid). Default 10. */
	readonly gridSize?: number;
	/** Line sharpness (higher = thinner, crisper lines). Default 15. */
	readonly gridThickness?: number;
	/** Distance falloff exponent from the center. Default 1.5. */
	readonly fadeDistance?: number;
	/** Corner vignette strength. Default 2. */
	readonly vignetteStrength?: number;
	/** Extra soft glow around the lines (0 off). Default 0.1. */
	readonly glowIntensity?: number;
	/** Overall opacity multiplier. Default 1. */
	readonly opacity?: number;
	/** Grid rotation in degrees. Default 0. */
	readonly gridRotation?: number;
	/** React to the pointer (a secondary ripple radiates from the cursor). Default false. */
	readonly followMouse?: boolean;
	/** Pointer influence radius when following. Default 1. */
	readonly mouseRadius?: number;
	readonly fps?: number;
	readonly renderScale?: number;
}

const FRAGMENT = `
uniform float iTime;
uniform vec2 iResolution;
uniform float uRainbow;
uniform vec3 uGridColor;
uniform float uRippleIntensity;
uniform float uGridSize;
uniform float uGridThickness;
uniform float uFadeDistance;
uniform float uVignetteStrength;
uniform float uGlowIntensity;
uniform float uOpacity;
uniform float uGridRotation;
uniform float uMouse;
uniform vec2 iMouse;
uniform float uMouseInfluence;
uniform float uMouseRadius;
varying vec2 vUv;

const float PI = 3.141592;

mat2 rotate(float angle) {
	float s = sin(angle);
	float c = cos(angle);
	return mat2(c, -s, s, c);
}

void main() {
	vec2 uv = vUv * 2.0 - 1.0;
	uv.x *= iResolution.x / iResolution.y;

	if (uGridRotation != 0.0) {
		uv = rotate(uGridRotation * PI / 180.0) * uv;
	}

	float dist = length(uv);
	float func = sin(PI * (iTime - dist));
	vec2 rippleUv = uv + uv * func * uRippleIntensity;

	if (uMouse > 0.5 && uMouseInfluence > 0.0) {
		vec2 mouseUv = iMouse * 2.0 - 1.0;
		mouseUv.x *= iResolution.x / iResolution.y;
		float mouseDist = length(uv - mouseUv);
		float influence = uMouseInfluence * exp(-mouseDist * mouseDist / (uMouseRadius * uMouseRadius));
		float mouseWave = sin(PI * (iTime * 2.0 - mouseDist * 3.0)) * influence;
		rippleUv += normalize(uv - mouseUv) * mouseWave * uRippleIntensity * 0.3;
	}

	vec2 a = sin(uGridSize * 0.5 * PI * rippleUv - PI / 2.0);
	vec2 b = abs(a);

	float aaWidth = 0.5;
	vec2 smoothB = vec2(
		smoothstep(0.0, aaWidth, b.x),
		smoothstep(0.0, aaWidth, b.y)
	);

	vec3 color = vec3(0.0);
	color += exp(-uGridThickness * smoothB.x * (0.8 + 0.5 * sin(PI * iTime)));
	color += exp(-uGridThickness * smoothB.y);
	color += 0.5 * exp(-(uGridThickness / 4.0) * sin(smoothB.x));
	color += 0.5 * exp(-(uGridThickness / 3.0) * smoothB.y);

	if (uGlowIntensity > 0.0) {
		color += uGlowIntensity * exp(-uGridThickness * 0.5 * smoothB.x);
		color += uGlowIntensity * exp(-uGridThickness * 0.5 * smoothB.y);
	}

	float ddd = exp(-2.0 * clamp(pow(dist, uFadeDistance), 0.0, 1.0));

	vec2 vignetteCoords = vUv - 0.5;
	float vignetteDistance = length(vignetteCoords);
	float vignette = 1.0 - pow(vignetteDistance * 2.0, uVignetteStrength);
	vignette = clamp(vignette, 0.0, 1.0);

	vec3 t;
	if (uRainbow > 0.5) {
		t = vec3(
			uv.x * 0.5 + 0.5 * sin(iTime),
			uv.y * 0.5 + 0.5 * cos(iTime),
			pow(cos(iTime), 4.0)
		) + 0.5;
	} else {
		t = uGridColor;
	}

	float finalFade = ddd * vignette;
	float alpha = length(color) * finalFade * uOpacity;
	gl_FragColor = vec4(color * t * finalFade * uOpacity, alpha);
}
`;

export function RippleGridBackground({
	className,
	gridColor = "var(--fr-accent)",
	rainbow = false,
	rippleIntensity = 0.05,
	gridSize = 10,
	gridThickness = 15,
	fadeDistance = 1.5,
	vignetteStrength = 2,
	glowIntensity = 0.1,
	opacity = 1,
	gridRotation = 0,
	followMouse = false,
	mouseRadius = 1,
	fps,
	renderScale,
}: RippleGridBackgroundProps) {
	const [rgb] = useCssColors([gridColor]);
	const uniforms = useMemo(
		() => ({
			uGridColor: rgb ?? [1, 1, 1],
			uRainbow: rainbow ? 1 : 0,
			uRippleIntensity: rippleIntensity,
			uGridSize: gridSize,
			uGridThickness: gridThickness,
			uFadeDistance: fadeDistance,
			uVignetteStrength: vignetteStrength,
			uGlowIntensity: glowIntensity,
			uOpacity: opacity,
			uGridRotation: gridRotation,
			uMouse: followMouse ? 1 : 0,
			iMouse: [0.5, 0.5],
			uMouseInfluence: followMouse ? 1 : 0,
			uMouseRadius: mouseRadius,
		}),
		[
			rgb,
			rainbow,
			rippleIntensity,
			gridSize,
			gridThickness,
			fadeDistance,
			vignetteStrength,
			glowIntensity,
			opacity,
			gridRotation,
			followMouse,
			mouseRadius,
		],
	);
	return (
		<ShaderBackground
			slot="ripple-grid-background"
			className={className}
			fragment={FRAGMENT}
			uniforms={uniforms}
			mouseUniform={followMouse ? "iMouse" : undefined}
			mouseSmoothing={0.1}
			fps={fps}
			renderScale={renderScale}
		/>
	);
}
