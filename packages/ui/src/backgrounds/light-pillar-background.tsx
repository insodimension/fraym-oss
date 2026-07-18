/**
 * LightPillarBackground — a raymarched volumetric light column, slowly churning.
 * Fraym-native port of react-bits' "LightPillar" (MIT,
 * https://reactbits.dev/backgrounds/light-pillar) on the shared
 * {@link ShaderBackground} host — three.js removed, the raymarch down-leveled to
 * GLSL ES 1.00 (fullscreen triangle, hand-rolled tanh), and the source's opaque
 * "screen" composite replaced by premultiplied additive light over transparency
 * so it layers on light and dark surfaces alike.
 *
 * Theme-native: top/bottom colors default to Fraym iris + accent tokens. Quality
 * bakes the raymarch iteration counts as GLSL constants (loop bounds must be
 * constant in ES 1.00), so the host recompiles the shader when it changes.
 */

import { useMemo } from "react";
import { ShaderBackground, useCssColors } from "./shader-background";

export type LightPillarQuality = "low" | "medium" | "high";

export interface LightPillarBackgroundProps {
	readonly className?: string;
	/** Color at the top of the pillar. CSS color, tokens welcome. Default the iris token. */
	readonly topColor?: string;
	/** Color at the base of the pillar. CSS color, tokens welcome. Default the accent token. */
	readonly bottomColor?: string;
	/** Overall light intensity. Default 1. */
	readonly intensity?: number;
	/** Rotation speed (also drives the pillar's internal churn). Default 0.3. */
	readonly rotationSpeed?: number;
	/** Steer the pillar's spin with the pointer. Default false (backdrops). */
	readonly followMouse?: boolean;
	/** Glow bloom strength. Default 0.005. */
	readonly glowAmount?: number;
	/** Pillar radius (wider = fatter column). Default 3. */
	readonly pillarWidth?: number;
	/** Vertical density of the internal pattern. Default 0.4. */
	readonly pillarHeight?: number;
	/** Film grain over the pillar (0..1). Default 0.5. */
	readonly noiseIntensity?: number;
	/** Static tilt of the whole pillar, in degrees. Default 0. */
	readonly pillarRotation?: number;
	/** Raymarch quality: more iterations = denser glow, higher cost. Default "high". */
	readonly quality?: LightPillarQuality;
	readonly fps?: number;
	readonly renderScale?: number;
}

/** Raymarch loop budgets per quality — the source's qualitySettings, minus the
 *  device auto-downgrade (the host owns perf via fps/renderScale) and precision
 *  (the host prepends `precision highp float;`). */
const QUALITY: Record<
	LightPillarQuality,
	{ readonly iterations: number; readonly waveIterations: number; readonly stepMultiplier: number }
> = {
	low: { iterations: 24, waveIterations: 1, stepMultiplier: 1.5 },
	medium: { iterations: 40, waveIterations: 2, stepMultiplier: 1.2 },
	high: { iterations: 80, waveIterations: 4, stepMultiplier: 1 },
};

/** GLSL ES 1.00 needs constant loop bounds, so the iteration counts are baked in
 *  per quality rather than passed as uniforms. */
function buildFragment(quality: LightPillarQuality): string {
	const q = QUALITY[quality];
	return `
uniform vec2 iResolution;
uniform float iTime;
uniform vec2 iMouse;

uniform vec3 uTopColor;
uniform vec3 uBottomColor;
uniform float uIntensity;
uniform float uInteractive;
uniform float uGlowAmount;
uniform float uPillarWidth;
uniform float uPillarHeight;
uniform float uNoiseIntensity;
uniform float uRotationSpeed;
uniform float uPillarRotation;

varying vec2 vUv;

const int MAX_ITER = ${q.iterations};
const int WAVE_ITER = ${q.waveIterations};
const float STEP_MULT = ${q.stepMultiplier.toFixed(2)};

// ES 1.00 has no tanh; roll a stable componentwise one (col is always >= 0).
vec3 tanhApprox(vec3 x) {
	vec3 e = exp(-2.0 * max(x, 0.0));
	return (1.0 - e) / (1.0 + e);
}

void main() {
	// Source accumulated time at ~rotationSpeed per second; iTime * speed matches.
	float tm = iTime * uRotationSpeed;

	float prc = cos(uPillarRotation);
	float prs = sin(uPillarRotation);
	float waveCos = cos(0.4);
	float waveSin = sin(0.4);

	vec2 uv = (vUv * 2.0 - 1.0) * vec2(iResolution.x / iResolution.y, 1.0);
	uv = vec2(prc * uv.x - prs * uv.y, prs * uv.x + prc * uv.y);

	vec3 ro = vec3(0.0, 0.0, -10.0);
	vec3 rd = normalize(vec3(uv, 1.0));

	float rotC = cos(tm * 0.3);
	float rotS = sin(tm * 0.3);
	vec2 mouse = iMouse * 2.0 - 1.0;
	if (uInteractive > 0.5 && (mouse.x != 0.0 || mouse.y != 0.0)) {
		float a = mouse.x * 6.283185;
		rotC = cos(a);
		rotS = sin(a);
	}

	vec3 col = vec3(0.0);
	float t = 0.1;

	for (int i = 0; i < MAX_ITER; i++) {
		vec3 p = ro + rd * t;
		p.xz = vec2(rotC * p.x - rotS * p.z, rotS * p.x + rotC * p.z);

		vec3 q = p;
		q.y = p.y * uPillarHeight + tm;

		float freq = 1.0;
		float amp = 1.0;
		for (int j = 0; j < WAVE_ITER; j++) {
			q.xz = vec2(waveCos * q.x - waveSin * q.z, waveSin * q.x + waveCos * q.z);
			q += cos(q.zxy * freq - tm * float(j) * 2.0) * amp;
			freq *= 2.0;
			amp *= 0.5;
		}

		float d = length(cos(q.xz)) - 0.2;
		float bound = length(p.xz) - uPillarWidth;
		float k = 4.0;
		float h = max(k - abs(d - bound), 0.0);
		d = max(d, bound) + h * h * 0.0625 / k;
		d = abs(d) * 0.15 + 0.01;

		float grad = clamp((15.0 - p.y) / 30.0, 0.0, 1.0);
		col += mix(uBottomColor, uTopColor, grad) / d;

		t += d * STEP_MULT;
		if (t > 50.0) break;
	}

	float widthNorm = uPillarWidth / 3.0;
	col = tanhApprox(col * uGlowAmount / widthNorm);

	col -= fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) / 15.0 * uNoiseIntensity;

	// Source rendered opaque and relied on mix-blend "screen"; emit premultiplied
	// additive light over transparency instead (host blend ONE, 1-src-a).
	vec3 lit = max(col * uIntensity, 0.0);
	float alpha = clamp(max(lit.r, max(lit.g, lit.b)), 0.0, 1.0);
	gl_FragColor = vec4(lit * alpha, alpha);
}
`;
}

export function LightPillarBackground({
	className,
	topColor = "var(--fr-iris)",
	bottomColor = "var(--fr-accent)",
	intensity = 1,
	rotationSpeed = 0.3,
	followMouse = false,
	glowAmount = 0.005,
	pillarWidth = 3,
	pillarHeight = 0.4,
	noiseIntensity = 0.5,
	pillarRotation = 0,
	quality = "high",
	fps,
	renderScale,
}: LightPillarBackgroundProps) {
	const [top, bottom] = useCssColors([topColor, bottomColor]);
	const fragment = useMemo(() => buildFragment(quality), [quality]);
	const uniforms = useMemo(
		() => ({
			uTopColor: top ?? [1, 1, 1],
			uBottomColor: bottom ?? [1, 1, 1],
			uIntensity: intensity,
			uInteractive: followMouse ? 1 : 0,
			uGlowAmount: glowAmount,
			uPillarWidth: pillarWidth,
			uPillarHeight: pillarHeight,
			uNoiseIntensity: noiseIntensity,
			uRotationSpeed: rotationSpeed,
			uPillarRotation: (pillarRotation * Math.PI) / 180,
			iMouse: [0.5, 0.5],
		}),
		[
			top,
			bottom,
			intensity,
			followMouse,
			glowAmount,
			pillarWidth,
			pillarHeight,
			noiseIntensity,
			rotationSpeed,
			pillarRotation,
		],
	);
	return (
		<ShaderBackground
			slot="light-pillar-background"
			className={className}
			fragment={fragment}
			uniforms={uniforms}
			mouseUniform={followMouse ? "iMouse" : undefined}
			mouseSmoothing={0.08}
			fps={fps}
			renderScale={renderScale}
		/>
	);
}
