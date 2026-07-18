/**
 * SoftAuroraBackground — two drifting perlin light bands with cosine-gradient
 * shimmer, gentler than the aurora curtain. Fraym-native port of react-bits'
 * "SoftAurora" (MIT, https://reactbits.dev/backgrounds/soft-aurora) on the
 * shared {@link ShaderBackground} host — ogl removed, mouse drift riding the
 * host's smoothed pointer.
 *
 * Theme-native: both band colors default to Fraym tokens and accept any CSS
 * color including `var(--fr-*)`; additive light over transparency reads on
 * light and dark surfaces alike.
 */

import { useMemo } from "react";
import { ShaderBackground, useCssColors } from "./shader-background";

export interface SoftAuroraBackgroundProps {
	readonly className?: string;
	/** First band color. Default the theme text glow (soft white). */
	readonly color1?: string;
	/** Second band color. Default the accent token. */
	readonly color2?: string;
	/** Animation speed. Default 0.6. */
	readonly speed?: number;
	/** Noise field zoom. Default 1.5. */
	readonly scale?: number;
	/** Overall brightness. Default 1. */
	readonly brightness?: number;
	/** Noise frequency. Default 2.5. */
	readonly noiseFrequency?: number;
	/** Noise amplitude. Default 1. */
	readonly noiseAmplitude?: number;
	/** Vertical band position (0 bottom .. 1 top). Default 0.5. */
	readonly bandHeight?: number;
	/** Band thickness/glow spread. Default 1. */
	readonly bandSpread?: number;
	/** Octave falloff of the noise stack. Default 0.1. */
	readonly octaveDecay?: number;
	/** Time offset between the two bands. Default 0. */
	readonly layerOffset?: number;
	/** Shimmer drift speed along x. Default 1. */
	readonly colorSpeed?: number;
	/** Follow the pointer with a parallax shift. Default false (backdrops). */
	readonly followMouse?: boolean;
	/** Pointer shift strength. Default 0.25. */
	readonly mouseInfluence?: number;
	readonly fps?: number;
	readonly renderScale?: number;
}

const FRAGMENT = `
uniform vec2 iResolution;
uniform float iTime;
uniform float uSpeed;
uniform float uScale;
uniform float uBrightness;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform float uNoiseFreq;
uniform float uNoiseAmp;
uniform float uBandHeight;
uniform float uBandSpread;
uniform float uOctaveDecay;
uniform float uLayerOffset;
uniform float uColorSpeed;
uniform vec2 iMouse;
uniform float uMouseInfluence;

#define TAU 6.28318

vec3 gradientHash(vec3 p) {
	p = vec3(
		dot(p, vec3(127.1, 311.7, 234.6)),
		dot(p, vec3(269.5, 183.3, 198.3)),
		dot(p, vec3(169.5, 283.3, 156.9))
	);
	vec3 h = fract(sin(p) * 43758.5453123);
	float phi = acos(2.0 * h.x - 1.0);
	float theta = TAU * h.y;
	return vec3(cos(theta) * sin(phi), sin(theta) * cos(phi), cos(phi));
}

float quinticSmooth(float t) {
	float t2 = t * t;
	float t3 = t * t2;
	return 6.0 * t3 * t2 - 15.0 * t2 * t2 + 10.0 * t3;
}

vec3 cosineGradient(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
	return a + b * cos(TAU * (c * t + d));
}

float perlin3D(float amplitude, float frequency, float px, float py, float pz) {
	float x = px * frequency;
	float y = py * frequency;
	float fx = floor(x); float fy = floor(y); float fz = floor(pz);
	float cx = ceil(x);  float cy = ceil(y);  float cz = ceil(pz);
	vec3 g000 = gradientHash(vec3(fx, fy, fz));
	vec3 g100 = gradientHash(vec3(cx, fy, fz));
	vec3 g010 = gradientHash(vec3(fx, cy, fz));
	vec3 g110 = gradientHash(vec3(cx, cy, fz));
	vec3 g001 = gradientHash(vec3(fx, fy, cz));
	vec3 g101 = gradientHash(vec3(cx, fy, cz));
	vec3 g011 = gradientHash(vec3(fx, cy, cz));
	vec3 g111 = gradientHash(vec3(cx, cy, cz));
	float d000 = dot(g000, vec3(x - fx, y - fy, pz - fz));
	float d100 = dot(g100, vec3(x - cx, y - fy, pz - fz));
	float d010 = dot(g010, vec3(x - fx, y - cy, pz - fz));
	float d110 = dot(g110, vec3(x - cx, y - cy, pz - fz));
	float d001 = dot(g001, vec3(x - fx, y - fy, pz - cz));
	float d101 = dot(g101, vec3(x - cx, y - fy, pz - cz));
	float d011 = dot(g011, vec3(x - fx, y - cy, pz - cz));
	float d111 = dot(g111, vec3(x - cx, y - cy, pz - cz));
	float sx = quinticSmooth(x - fx);
	float sy = quinticSmooth(y - fy);
	float sz = quinticSmooth(pz - fz);
	float lx00 = mix(d000, d100, sx);
	float lx10 = mix(d010, d110, sx);
	float lx01 = mix(d001, d101, sx);
	float lx11 = mix(d011, d111, sx);
	float ly0 = mix(lx00, lx10, sy);
	float ly1 = mix(lx01, lx11, sy);
	return amplitude * mix(ly0, ly1, sz);
}

float auroraGlow(float t, vec2 shift) {
	vec2 uv = gl_FragCoord.xy / iResolution.y;
	uv += shift;
	float noiseVal = 0.0;
	float freq = uNoiseFreq;
	float amp = uNoiseAmp;
	vec2 samplePos = uv * uScale;
	for (float i = 0.0; i < 3.0; i += 1.0) {
		noiseVal += perlin3D(amp, freq, samplePos.x, samplePos.y, t);
		amp *= uOctaveDecay;
		freq *= 2.0;
	}
	float yBand = uv.y * 10.0 - uBandHeight * 10.0;
	return 0.3 * max(exp(uBandSpread * (1.0 - 1.1 * abs(noiseVal + yBand))), 0.0);
}

void main() {
	vec2 uv = gl_FragCoord.xy / iResolution.xy;
	float t = uSpeed * 0.4 * iTime;

	vec2 shift = (iMouse - 0.5) * uMouseInfluence;

	vec3 col = vec3(0.0);
	col += 0.99 * auroraGlow(t, shift)
		* cosineGradient(uv.x + iTime * uSpeed * 0.2 * uColorSpeed, vec3(0.5), vec3(0.5), vec3(1.0), vec3(0.3, 0.20, 0.20))
		* uColor1;
	col += 0.99 * auroraGlow(t + uLayerOffset, shift)
		* cosineGradient(uv.x + iTime * uSpeed * 0.1 * uColorSpeed, vec3(0.5), vec3(0.5), vec3(2.0, 1.0, 0.0), vec3(0.5, 0.20, 0.25))
		* uColor2;

	col *= uBrightness;
	float alpha = clamp(length(col), 0.0, 1.0);
	gl_FragColor = vec4(col * alpha, alpha);
}
`;

export function SoftAuroraBackground({
	className,
	color1 = "var(--fr-text)",
	color2 = "var(--fr-accent)",
	speed = 0.6,
	scale = 1.5,
	brightness = 1,
	noiseFrequency = 2.5,
	noiseAmplitude = 1,
	bandHeight = 0.5,
	bandSpread = 1,
	octaveDecay = 0.1,
	layerOffset = 0,
	colorSpeed = 1,
	followMouse = false,
	mouseInfluence = 0.25,
	fps,
	renderScale,
}: SoftAuroraBackgroundProps) {
	const [rgb1, rgb2] = useCssColors([color1, color2]);
	const uniforms = useMemo(
		() => ({
			uSpeed: speed,
			uScale: scale,
			uBrightness: brightness,
			uColor1: rgb1 ?? [1, 1, 1],
			uColor2: rgb2 ?? [1, 1, 1],
			uNoiseFreq: noiseFrequency,
			uNoiseAmp: noiseAmplitude,
			uBandHeight: bandHeight,
			uBandSpread: bandSpread,
			uOctaveDecay: octaveDecay,
			uLayerOffset: layerOffset,
			uColorSpeed: colorSpeed,
			iMouse: [0.5, 0.5],
			uMouseInfluence: followMouse ? mouseInfluence : 0,
		}),
		[
			speed,
			scale,
			brightness,
			rgb1,
			rgb2,
			noiseFrequency,
			noiseAmplitude,
			bandHeight,
			bandSpread,
			octaveDecay,
			layerOffset,
			colorSpeed,
			followMouse,
			mouseInfluence,
		],
	);
	return (
		<ShaderBackground
			slot="soft-aurora-background"
			className={className}
			fragment={FRAGMENT}
			uniforms={uniforms}
			mouseUniform={followMouse ? "iMouse" : undefined}
			fps={fps}
			renderScale={renderScale}
		/>
	);
}
