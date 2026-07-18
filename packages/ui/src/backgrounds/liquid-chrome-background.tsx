/**
 * LiquidChromeBackground — a flowing metallic sheen: an iterated cosine-warp
 * field crossed by bright reflective veins that ripple and drift. Fraym-native
 * port of react-bits' "LiquidChrome" (MIT,
 * https://reactbits.dev/backgrounds/liquid-chrome) on the shared
 * {@link ShaderBackground} host — ogl removed, the vec3 resolution collapsed to
 * the host's vec2 iResolution, the JS-side `uTime` scaling folded into iTime,
 * and the pointer wired to the host's smoothed `iMouse`.
 *
 * Theme-native: the origin cleared to opaque white and filled a solid metallic
 * field (a dark base color divided by a sine, blowing out to hard highlights).
 * Here the sheen is emitted as ADDITIVE LIGHT over a transparent canvas — its
 * own brightness drives the alpha and premultiplies the color, so the field
 * stays a faint token-tinted wash with bright chrome veins that read on light
 * AND dark surfaces alike. The metal tints from a CSS color (default the accent
 * token, `var(--fr-*)` welcome) instead of a hardcoded silver-blue.
 *
 * Mouse interaction is OFF by default (backdrops); `followMouse` wires the
 * pointer into the warp phase and a local ripple.
 */

import { useMemo } from "react";
import { ShaderBackground, useCssColors } from "./shader-background";

export interface LiquidChromeBackgroundProps {
	readonly className?: string;
	/** Metal tint. CSS color, tokens welcome. Default the accent token. */
	readonly color?: string;
	/** Flow and shimmer speed. Default 0.2. */
	readonly speed?: number;
	/** Warp strength: how far each cosine octave displaces the field. Default 0.3. */
	readonly amplitude?: number;
	/** Horizontal warp frequency (vein density across x). Default 3. */
	readonly frequencyX?: number;
	/** Vertical warp frequency (vein density across y). Default 3. */
	readonly frequencyY?: number;
	/** Overall light intensity of the sheen. Default 1. */
	readonly intensity?: number;
	/** React to the pointer: warp phase follows it and a ripple trails it. Default false (backdrops). */
	readonly followMouse?: boolean;
	readonly fps?: number;
	readonly renderScale?: number;
}

const FRAGMENT = `
uniform vec2 iResolution;
uniform float iTime;
uniform vec3 uColor;
uniform float uSpeed;
uniform float uAmplitude;
uniform float uFrequencyX;
uniform float uFrequencyY;
uniform float uIntensity;
uniform vec2 iMouse;
uniform float uMouseActive;

vec4 renderImage(vec2 uvCoord, float t) {
	vec2 fragCoord = uvCoord * iResolution.xy;
	vec2 uv = (2.0 * fragCoord - iResolution.xy) / min(iResolution.x, iResolution.y);

	for (float i = 1.0; i < 10.0; i++) {
		uv.x += uAmplitude / i * cos(i * uFrequencyX * uv.y + t + iMouse.x * 3.14159);
		uv.y += uAmplitude / i * cos(i * uFrequencyY * uv.x + t + iMouse.y * 3.14159);
	}

	// Pointer ripple, active only while following.
	vec2 diff = uvCoord - iMouse;
	float dist = length(diff);
	float falloff = exp(-dist * 20.0);
	float ripple = sin(10.0 * dist - t * 2.0) * 0.03 * uMouseActive;
	uv += (diff / (dist + 0.0001)) * ripple * falloff;

	// Metallic sheen: bright reflective veins where the sine crosses zero, a
	// faint continuous wash elsewhere. Bounded (the origin's raw 1/sin blew to
	// infinity on an opaque field) and reshaped into premultiplied additive
	// light so it composites over the themed surface.
	float s = abs(sin(t - uv.y - uv.x));
	float sheen = 0.08 / (s + 0.05);
	vec3 col = uColor * sheen * uIntensity;
	float a = clamp(sheen, 0.0, 1.0);
	return vec4(col * a, a);
}

void main() {
	float t = iTime * uSpeed;
	vec4 col = vec4(0.0);
	for (int i = -1; i <= 1; i++) {
		for (int j = -1; j <= 1; j++) {
			vec2 offset = vec2(float(i), float(j)) * (1.0 / min(iResolution.x, iResolution.y));
			col += renderImage(gl_FragCoord.xy / iResolution.xy + offset, t);
		}
	}
	gl_FragColor = col / 9.0;
}
`;

export function LiquidChromeBackground({
	className,
	color = "var(--fr-accent)",
	speed = 0.2,
	amplitude = 0.3,
	frequencyX = 3,
	frequencyY = 3,
	intensity = 1,
	followMouse = false,
	fps,
	renderScale = 0.75,
}: LiquidChromeBackgroundProps) {
	const [rgb] = useCssColors([color]);
	const uniforms = useMemo(
		() => ({
			uColor: rgb ?? [1, 1, 1],
			uSpeed: speed,
			uAmplitude: amplitude,
			uFrequencyX: frequencyX,
			uFrequencyY: frequencyY,
			uIntensity: intensity,
			iMouse: [0.5, 0.5],
			uMouseActive: followMouse ? 1 : 0,
		}),
		[rgb, speed, amplitude, frequencyX, frequencyY, intensity, followMouse],
	);
	return (
		<ShaderBackground
			slot="liquid-chrome-background"
			className={className}
			fragment={FRAGMENT}
			uniforms={uniforms}
			mouseUniform={followMouse ? "iMouse" : undefined}
			fps={fps}
			renderScale={renderScale}
		/>
	);
}
