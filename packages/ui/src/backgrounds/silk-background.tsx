/**
 * SilkBackground — a slow, woven sheen of light rippling across the surface,
 * like brushed silk catching the light. Fraym-native port of react-bits' "Silk"
 * (MIT, https://reactbits.dev/backgrounds/silk) on the shared
 * {@link ShaderBackground} host — three/@react-three/fiber removed, the plane's
 * `vUv` recovered from `gl_FragCoord / iResolution`, and the JS-side per-frame
 * time accumulation (`uTime += 0.1 * delta`) folded INTO the shader as
 * `iTime * 0.1`.
 *
 * Theme-native adaptation: the origin renders an OPAQUE tinted field
 * (`vec4(uColor, 1.0) * pattern`). Here the woven pattern instead drives the
 * ALPHA of a single tint over a transparent canvas — bright weave threads paint
 * more of the color, troughs stay transparent — so the sheen layers as additive
 * light over the caller's `bg-fr-bg` and reads on light AND dark surfaces. The
 * color defaults to the Fraym accent token (the origin's neutral `#7B7481` is
 * not theme-aware) and may be ANY CSS color including `var(--fr-*)`.
 */

import { useMemo } from "react";
import { ShaderBackground, useCssColors } from "./shader-background";

export interface SilkBackgroundProps {
	readonly className?: string;
	/** Silk tint. CSS color, tokens welcome. Default the accent token. */
	readonly color?: string;
	/** Weave animation speed. Default 5 (the origin default). */
	readonly speed?: number;
	/** Weave tiling scale (applied twice, as in the origin). Default 1. */
	readonly scale?: number;
	/** Static rotation of the weave in radians. Default 0. */
	readonly rotation?: number;
	/** Per-pixel grain subtracted from the weave (0 clean .. up). Default 1.5. */
	readonly noiseIntensity?: number;
	/** Overall light coverage. Default 1. */
	readonly intensity?: number;
	readonly fps?: number;
	readonly renderScale?: number;
}

const FRAGMENT = `
uniform vec2 iResolution;
uniform float iTime;
uniform vec3 uColor;
uniform float uSpeed;
uniform float uScale;
uniform float uRotation;
uniform float uNoiseIntensity;
uniform float uIntensity;

const float e = 2.71828182845904523536;

float noise(vec2 texCoord) {
	float G = e;
	vec2 r = (G * sin(G * texCoord));
	return fract(r.x * r.y * (1.0 + texCoord.x));
}

vec2 rotateUvs(vec2 uv, float angle) {
	float c = cos(angle);
	float s = sin(angle);
	mat2 rot = mat2(c, -s, s, c);
	return rot * uv;
}

void main() {
	vec2 vUv = gl_FragCoord.xy / iResolution;
	float rnd = noise(gl_FragCoord.xy);
	vec2 uv = rotateUvs(vUv * uScale, uRotation);
	vec2 tex = uv * uScale;
	// Origin accumulated uTime at 0.1 * delta per frame; fold that constant in.
	float tOffset = uSpeed * iTime * 0.1;

	tex.y += 0.03 * sin(8.0 * tex.x - tOffset);

	float pattern = 0.6 +
		0.4 * sin(5.0 * (tex.x + tex.y +
			cos(3.0 * tex.x + 5.0 * tex.y) +
			0.02 * tOffset) +
			sin(20.0 * (tex.x + tex.y - 0.1 * tOffset)));

	// Opaque-to-additive: the weave value becomes coverage, not a full color.
	float grain = rnd / 15.0 * uNoiseIntensity;
	float sheen = clamp(pattern - grain, 0.0, 1.0);
	float alpha = clamp(sheen * uIntensity, 0.0, 1.0);
	gl_FragColor = vec4(uColor * alpha, alpha);
}
`;

export function SilkBackground({
	className,
	color = "var(--fr-accent)",
	speed = 5,
	scale = 1,
	rotation = 0,
	noiseIntensity = 1.5,
	intensity = 1,
	fps,
	renderScale,
}: SilkBackgroundProps) {
	const [rgb] = useCssColors([color]);
	const uniforms = useMemo(
		() => ({
			uColor: rgb ?? [1, 1, 1],
			uSpeed: speed,
			uScale: scale,
			uRotation: rotation,
			uNoiseIntensity: noiseIntensity,
			uIntensity: intensity,
		}),
		[rgb, speed, scale, rotation, noiseIntensity, intensity],
	);
	return (
		<ShaderBackground
			slot="silk-background"
			className={className}
			fragment={FRAGMENT}
			uniforms={uniforms}
			fps={fps}
			renderScale={renderScale}
		/>
	);
}
