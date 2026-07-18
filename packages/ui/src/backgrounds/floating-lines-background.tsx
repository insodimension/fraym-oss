/**
 * FloatingLinesBackground — three bands of drifting, undulating light lines
 * that spiral out and bend toward the pointer. Fraym-native port of
 * react-bits' "FloatingLines" (MIT, https://reactbits.dev/backgrounds/floating-lines)
 * on the shared {@link ShaderBackground} host — three.js removed. The source
 * already draws its lines in one fullscreen fragment pass (not line geometry),
 * so the shader is ported directly: bool flags down-leveled to float flags, the
 * uniform-int line count made a float loop bound (constant-max with an early
 * break, ES 1.00 safe), the JS-side pointer parallax folded INTO the shader as
 * a fraction-space offset, and the hardcoded pink/blue ramp replaced with a
 * theme-native three-stop color gradient.
 *
 * Theme-native: the line colors default to the Fraym accent tokens and accept
 * ANY CSS color including `var(--fr-*)`. The output is additive light over a
 * transparent canvas, so it reads on light and dark surfaces alike. Pointer
 * interaction (bend + parallax) is OFF by default (backdrops).
 */

import { useMemo } from "react";
import { ShaderBackground, useCssColors } from "./shader-background";

export interface FloatingLinesBackgroundProps {
	readonly className?: string;
	/** Line gradient, left → right across each band. CSS colors, tokens welcome. */
	readonly colorStops?: readonly [string, string, string];
	/** Lines per band. Default 6. */
	readonly lineCount?: number;
	/** Spacing between adjacent lines. Default 5. */
	readonly lineDistance?: number;
	/** Wave amplitude multiplier. Default 1. */
	readonly amplitude?: number;
	/** Line thickness/brightness multiplier. Default 1. */
	readonly thickness?: number;
	/** Animation speed multiplier. Default 1. */
	readonly animationSpeed?: number;
	/** Overall light intensity. Default 1. */
	readonly intensity?: number;
	/** Bend lines toward the pointer and drift with parallax. Default false (backdrops). */
	readonly followMouse?: boolean;
	/** Radial falloff of the pointer bend (higher = tighter). Default 5. */
	readonly bendRadius?: number;
	/** Pointer bend strength. Default -0.5. */
	readonly bendStrength?: number;
	/** Pointer parallax drift, as a fraction of the viewport. Default 0.2. */
	readonly parallaxStrength?: number;
	readonly fps?: number;
	readonly renderScale?: number;
}

const FRAGMENT = `
uniform vec2 iResolution;
uniform float iTime;
uniform vec2 iMouse;
uniform float uAnimationSpeed;
uniform float uLineCount;
uniform float uLineDistance;
uniform float uAmplitude;
uniform float uThickness;
uniform float uIntensity;
uniform vec3 uColor0;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform float uBendRadius;
uniform float uBendStrength;
uniform float uInteractive;
uniform float uParallaxStrength;

#define MAX_LINES 64
#define TOP_WAVE vec3(10.0, 0.5, -0.4)
#define MIDDLE_WAVE vec3(5.0, 0.0, 0.2)
#define BOTTOM_WAVE vec3(2.0, -0.7, 0.4)

mat2 rotate(float r) {
	return mat2(cos(r), sin(r), -sin(r), cos(r));
}

vec3 ramp(float t) {
	vec3 lower = mix(uColor0, uColor1, clamp(t / 0.5, 0.0, 1.0));
	return mix(lower, uColor2, clamp((t - 0.5) / 0.5, 0.0, 1.0)) * 0.5;
}

float wave(vec2 uv, float offset, vec2 screenUv, vec2 mouseUv) {
	float time = iTime * uAnimationSpeed;

	float x_movement = time * 0.1;
	float amp = sin(offset + time * 0.2) * 0.3 * uAmplitude;
	float y = sin(uv.x + offset + x_movement) * amp;

	if (uInteractive > 0.5) {
		vec2 d = screenUv - mouseUv;
		float influence = exp(-dot(d, d) * uBendRadius);
		y += (mouseUv.y - screenUv.y) * influence * uBendStrength;
	}

	float m = uv.y - y;
	return uThickness * 0.0175 / max(abs(m) + 0.01, 1e-3);
}

vec3 band(vec2 baseUv, vec2 mouseUv, vec3 wavePos, float phaseBase, float phaseStep, float bandScale, float invertX) {
	vec3 col = vec3(0.0);
	int count = int(uLineCount);

	float angle = wavePos.z * log(length(baseUv) + 1.0);
	vec2 ruv = baseUv * rotate(angle);
	if (invertX > 0.5) ruv.x *= -1.0;

	for (int i = 0; i < MAX_LINES; i++) {
		if (i >= count) break;
		float fi = float(i);
		float t = fi / max(uLineCount - 1.0, 1.0);
		vec3 lineCol = ramp(t);
		col += lineCol * wave(
			ruv + vec2(uLineDistance * fi + wavePos.x, wavePos.y),
			phaseBase + phaseStep * fi,
			baseUv,
			mouseUv
		) * bandScale;
	}

	return col;
}

void main() {
	vec2 baseUv = (2.0 * gl_FragCoord.xy - iResolution) / iResolution.y;
	baseUv.y *= -1.0;

	if (uInteractive > 0.5) {
		baseUv += (iMouse - vec2(0.5)) * uParallaxStrength;
	}

	vec2 mouseUv = vec2(0.0);
	if (uInteractive > 0.5) {
		vec2 mousePx = iMouse * iResolution;
		mouseUv = (2.0 * mousePx - iResolution) / iResolution.y;
		mouseUv.y *= -1.0;
	}

	vec3 col = vec3(0.0);
	col += band(baseUv, mouseUv, BOTTOM_WAVE, 1.5, 0.2, 0.2, 0.0);
	col += band(baseUv, mouseUv, MIDDLE_WAVE, 2.0, 0.15, 1.0, 0.0);
	col += band(baseUv, mouseUv, TOP_WAVE, 1.0, 0.2, 0.1, 1.0);

	col *= uIntensity;
	float alpha = clamp(max(col.r, max(col.g, col.b)), 0.0, 1.0);
	gl_FragColor = vec4(col * alpha, alpha);
}
`;

export function FloatingLinesBackground({
	className,
	colorStops = ["var(--fr-accent)", "var(--fr-iris)", "var(--fr-accent)"],
	lineCount = 6,
	lineDistance = 5,
	amplitude = 1,
	thickness = 1,
	animationSpeed = 1,
	intensity = 1,
	followMouse = false,
	bendRadius = 5,
	bendStrength = -0.5,
	parallaxStrength = 0.2,
	fps,
	renderScale,
}: FloatingLinesBackgroundProps) {
	const [stop0, stop1, stop2] = useCssColors(colorStops);
	const uniforms = useMemo(
		() => ({
			uColor0: stop0 ?? [1, 1, 1],
			uColor1: stop1 ?? [1, 1, 1],
			uColor2: stop2 ?? [1, 1, 1],
			uLineCount: lineCount,
			uLineDistance: lineDistance * 0.01,
			uAmplitude: amplitude,
			uThickness: thickness,
			uAnimationSpeed: animationSpeed,
			uIntensity: intensity,
			iMouse: [0.5, 0.5],
			uInteractive: followMouse ? 1 : 0,
			uBendRadius: bendRadius,
			uBendStrength: bendStrength,
			uParallaxStrength: parallaxStrength,
		}),
		[
			stop0,
			stop1,
			stop2,
			lineCount,
			lineDistance,
			amplitude,
			thickness,
			animationSpeed,
			intensity,
			followMouse,
			bendRadius,
			bendStrength,
			parallaxStrength,
		],
	);
	return (
		<ShaderBackground
			slot="floating-lines-background"
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
