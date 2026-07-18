/**
 * DitherBackground — a slow, domain-warped Perlin wave field rendered in a
 * retro ordered-dither look: chunky pixelization plus a 4x4 Bayer threshold
 * matrix quantized to a handful of shades. Fraym-native port of react-bits'
 * "Dither" (MIT, https://reactbits.dev/backgrounds/dither) on the shared
 * {@link ShaderBackground} host.
 *
 * The origin ran a three.js `EffectComposer` pipeline: a first pass drew the
 * wave field to a framebuffer, a second `postprocessing` pass sampled that
 * buffer to pixelize and dither it. That whole two-pass pipeline is DROPPED —
 * there is no render-to-texture and no `postprocessing` dependency. It is re-
 * authored as ONE fragment shader: the wave `fbm` is evaluated directly at a
 * pixelized coordinate, then thresholded and quantized inline. The origin's
 * 8x8 Bayer `float[64]` (a GLSL ES 3.00 array constructor, illegal in ES 1.00)
 * is replaced by an array-free recursive 4x4 Bayer (`bayer2` / `bayer4`).
 *
 * Theme-native: the origin mixed the wave up out of pure black in a gray
 * `waveColor` on a dark canvas. Here the quantized wave shade is used as the
 * COVERAGE of the tint (default the accent token) over a transparent canvas —
 * premultiplied additive light, so the dithered field reads on light AND dark.
 * Mouse interaction is OFF by default (backdrops).
 */

import { useMemo } from "react";
import { ShaderBackground, useCssColors } from "./shader-background";

export interface DitherBackgroundProps {
	readonly className?: string;
	/** Wave tint. CSS color, tokens welcome. Default the accent token. */
	readonly color?: string;
	/** Wave scroll speed. Default 0.05. */
	readonly waveSpeed?: number;
	/** Base wave frequency (fbm lacunarity). Default 3. */
	readonly waveFrequency?: number;
	/** Per-octave amplitude falloff of the wave detail. Default 0.3. */
	readonly waveAmplitude?: number;
	/** Number of quantized shades in the dither. Default 4. */
	readonly colorNum?: number;
	/** Pixel block size in device pixels (chunkier = larger blocks). Default 2. */
	readonly pixelSize?: number;
	/** Overall light intensity. Default 1. */
	readonly intensity?: number;
	/** React to the pointer (dents the wave near the cursor). Default false. */
	readonly followMouse?: boolean;
	/** Pointer dent radius when following. Default 1. */
	readonly mouseRadius?: number;
	readonly fps?: number;
	readonly renderScale?: number;
}

const FRAGMENT = `
uniform vec2 iResolution;
uniform float iTime;
uniform float uWaveSpeed;
uniform float uWaveFrequency;
uniform float uWaveAmplitude;
uniform float uColorNum;
uniform float uPixelSize;
uniform float uIntensity;
uniform vec3 uColor;
uniform vec2 iMouse;
uniform float uMouseActive;
uniform float uMouseRadius;

vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
vec2 fade(vec2 t) { return t * t * t * (t * (t * 6.0 - 15.0) + 10.0); }

float cnoise(vec2 P) {
	vec4 Pi = floor(P.xyxy) + vec4(0.0, 0.0, 1.0, 1.0);
	vec4 Pf = fract(P.xyxy) - vec4(0.0, 0.0, 1.0, 1.0);
	Pi = mod289(Pi);
	vec4 ix = Pi.xzxz;
	vec4 iy = Pi.yyww;
	vec4 fx = Pf.xzxz;
	vec4 fy = Pf.yyww;
	vec4 i = permute(permute(ix) + iy);
	vec4 gx = fract(i * (1.0 / 41.0)) * 2.0 - 1.0;
	vec4 gy = abs(gx) - 0.5;
	vec4 tx = floor(gx + 0.5);
	gx = gx - tx;
	vec2 g00 = vec2(gx.x, gy.x);
	vec2 g10 = vec2(gx.y, gy.y);
	vec2 g01 = vec2(gx.z, gy.z);
	vec2 g11 = vec2(gx.w, gy.w);
	vec4 norm = taylorInvSqrt(vec4(dot(g00, g00), dot(g01, g01), dot(g10, g10), dot(g11, g11)));
	g00 *= norm.x; g01 *= norm.y; g10 *= norm.z; g11 *= norm.w;
	float n00 = dot(g00, vec2(fx.x, fy.x));
	float n10 = dot(g10, vec2(fx.y, fy.y));
	float n01 = dot(g01, vec2(fx.z, fy.z));
	float n11 = dot(g11, vec2(fx.w, fy.w));
	vec2 fade_xy = fade(Pf.xy);
	vec2 n_x = mix(vec2(n00, n01), vec2(n10, n11), fade_xy.x);
	return 2.3 * mix(n_x.x, n_x.y, fade_xy.y);
}

const int OCTAVES = 4;
float fbm(vec2 p) {
	float value = 0.0;
	float amp = 1.0;
	float freq = uWaveFrequency;
	for (int i = 0; i < OCTAVES; i++) {
		value += amp * abs(cnoise(p));
		p *= freq;
		amp *= uWaveAmplitude;
	}
	return value;
}

float pattern(vec2 p) {
	vec2 p2 = p - iTime * uWaveSpeed;
	return fbm(p + fbm(p2));
}

// Array-free recursive ordered dither: bayer2 is the 2x2 base pattern, bayer4
// folds a coarse cell index over it to build the full 4x4 matrix in [0, 1).
float bayer2(vec2 a) {
	a = floor(a);
	return fract(a.x * 0.5 + a.y * a.y * 0.75);
}
float bayer4(vec2 a) {
	return bayer2(0.5 * a) * 0.25 + bayer2(a);
}

void main() {
	// Pixelize: snap the fragment to a block grid of uPixelSize device pixels.
	vec2 block = floor(gl_FragCoord.xy / uPixelSize);
	vec2 uv = (block * uPixelSize) / iResolution;

	// Wave field at the pixelized coordinate (aspect-corrected, centered).
	vec2 p = uv - 0.5;
	p.x *= iResolution.x / iResolution.y;
	float f = pattern(p);

	if (uMouseActive > 0.5) {
		vec2 m = iMouse - 0.5;
		m.x *= iResolution.x / iResolution.y;
		float d = length(p - m);
		float effect = 1.0 - smoothstep(0.0, uMouseRadius, d);
		f -= 0.5 * effect;
	}

	// Ordered dither + quantize to uColorNum shades, at the pixel-block scale.
	float steps = max(uColorNum - 1.0, 1.0);
	float threshold = bayer4(block) - 0.5;
	f += threshold / steps;
	f = clamp(f, 0.0, 1.0);
	float shade = floor(f * steps + 0.5) / steps;

	// The quantized shade is coverage of the tint over transparency, so the
	// dithered field is additive light. Premultiplied for the host's blend.
	gl_FragColor = vec4(uColor * uIntensity * shade, shade);
}
`;

export function DitherBackground({
	className,
	color = "var(--fr-accent)",
	waveSpeed = 0.05,
	waveFrequency = 3,
	waveAmplitude = 0.3,
	colorNum = 4,
	pixelSize = 2,
	intensity = 1,
	followMouse = false,
	mouseRadius = 1,
	fps,
	renderScale,
}: DitherBackgroundProps) {
	const [rgb] = useCssColors([color]);
	const uniforms = useMemo(
		() => ({
			uColor: rgb ?? [1, 1, 1],
			uWaveSpeed: waveSpeed,
			uWaveFrequency: waveFrequency,
			uWaveAmplitude: waveAmplitude,
			uColorNum: colorNum,
			uPixelSize: Math.max(1, pixelSize),
			uIntensity: intensity,
			iMouse: [0.5, 0.5],
			uMouseActive: followMouse ? 1 : 0,
			uMouseRadius: mouseRadius,
		}),
		[rgb, waveSpeed, waveFrequency, waveAmplitude, colorNum, pixelSize, intensity, followMouse, mouseRadius],
	);
	return (
		<ShaderBackground
			slot="dither-background"
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
