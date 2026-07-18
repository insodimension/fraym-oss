/**
 * OrbBackground — a glowing energy orb: a noise-perturbed ring of light with an
 * orbiting internal flare and an optional pointer-driven wobble. Fraym-native
 * port of react-bits' "Orb" (MIT, https://reactbits.dev/backgrounds/orb) on the
 * shared {@link ShaderBackground} host — ogl removed, the vec3 resolution
 * collapsed to the host's vec2 iResolution, the JS-accumulated hover state
 * replaced by an in-shader pointer proximity read off the host's smoothed
 * `iMouse`, and GLSL kept at ES 1.00.
 *
 * Theme-native two ways: the orb's palette is DERIVED from the `color` token
 * (three analogous stops rotated by `hueShift`) so it re-tints with the accent,
 * and the origin's `backgroundColor` adaptation is retained and fed the
 * `--fr-bg` token — its luminance blends between the vivid dark-surface ring
 * and the softened light-surface ring, so the orb reads on light AND dark.
 * Output is premultiplied light over a transparent canvas. Pointer interaction
 * is OFF by default (backdrops); `followMouse` wires it to the host.
 */

import { useMemo } from "react";
import { ShaderBackground, useCssColors } from "./shader-background";

export interface OrbBackgroundProps {
	readonly className?: string;
	/** Orb tint the palette is derived from. CSS color, tokens welcome. Default the accent token. */
	readonly color?: string;
	/**
	 * Surface the orb is mounted over, used for the light/dark adaptation. CSS
	 * color, tokens welcome. Default the background token so it self-adapts.
	 */
	readonly backgroundColor?: string;
	/** Internal hue rotation of the derived palette, in degrees. Default 0. */
	readonly hueShift?: number;
	/** Pointer wobble strength when following (0 none .. 1 strong). Default 0.5. */
	readonly hoverIntensity?: number;
	/** React to the pointer: proximity drives the wobble. Default false (backdrops). */
	readonly followMouse?: boolean;
	readonly fps?: number;
	readonly renderScale?: number;
}

const FRAGMENT = `
uniform vec2 iResolution;
uniform float iTime;
uniform vec2 iMouse;
uniform vec3 uColor;
uniform vec3 uBackground;
uniform float uHueShift;
uniform float uHoverIntensity;
uniform float uFollowMouse;

varying vec2 vUv;

vec3 rgb2yiq(vec3 c) {
	float y = dot(c, vec3(0.299, 0.587, 0.114));
	float i = dot(c, vec3(0.596, -0.274, -0.322));
	float q = dot(c, vec3(0.211, -0.523, 0.312));
	return vec3(y, i, q);
}

vec3 yiq2rgb(vec3 c) {
	float r = c.x + 0.956 * c.y + 0.621 * c.z;
	float g = c.x - 0.272 * c.y - 0.647 * c.z;
	float b = c.x - 1.106 * c.y + 1.703 * c.z;
	return vec3(r, g, b);
}

vec3 adjustHue(vec3 color, float hueDeg) {
	float hueRad = hueDeg * 3.14159265 / 180.0;
	vec3 yiq = rgb2yiq(color);
	float cosA = cos(hueRad);
	float sinA = sin(hueRad);
	float i = yiq.y * cosA - yiq.z * sinA;
	float q = yiq.y * sinA + yiq.z * cosA;
	yiq.y = i;
	yiq.z = q;
	return yiq2rgb(yiq);
}

vec3 hash33(vec3 p3) {
	p3 = fract(p3 * vec3(0.1031, 0.11369, 0.13787));
	p3 += dot(p3, p3.yxz + 19.19);
	return -1.0 + 2.0 * fract(vec3(p3.x + p3.y, p3.x + p3.z, p3.y + p3.z) * p3.zyx);
}

float snoise3(vec3 p) {
	const float K1 = 0.333333333;
	const float K2 = 0.166666667;
	vec3 i = floor(p + (p.x + p.y + p.z) * K1);
	vec3 d0 = p - (i - (i.x + i.y + i.z) * K2);
	vec3 e = step(vec3(0.0), d0 - d0.yzx);
	vec3 i1 = e * (1.0 - e.zxy);
	vec3 i2 = 1.0 - e.zxy * (1.0 - e);
	vec3 d1 = d0 - (i1 - K2);
	vec3 d2 = d0 - (i2 - K1);
	vec3 d3 = d0 - 0.5;
	vec4 h = max(0.6 - vec4(dot(d0, d0), dot(d1, d1), dot(d2, d2), dot(d3, d3)), 0.0);
	vec4 n = h * h * h * h * vec4(
		dot(d0, hash33(i)),
		dot(d1, hash33(i + i1)),
		dot(d2, hash33(i + i2)),
		dot(d3, hash33(i + 1.0))
	);
	return dot(vec4(31.316), n);
}

vec4 extractAlpha(vec3 colorIn) {
	float a = max(max(colorIn.r, colorIn.g), colorIn.b);
	return vec4(colorIn.rgb / (a + 1e-5), a);
}

const float innerRadius = 0.6;
const float noiseScale = 0.65;

float light1(float intensity, float attenuation, float dist) {
	return intensity / (1.0 + dist * attenuation);
}

float light2(float intensity, float attenuation, float dist) {
	return intensity / (1.0 + dist * dist * attenuation);
}

vec4 draw(vec2 uv) {
	// Palette derived from the token: base, an analogous sheen, and a deep core,
	// each rotated by the internal hueShift.
	vec3 color1 = adjustHue(uColor, uHueShift);
	vec3 color2 = adjustHue(uColor, uHueShift + 55.0);
	vec3 color3 = adjustHue(uColor, uHueShift) * 0.35;

	float ang = atan(uv.y, uv.x);
	float len = length(uv);
	float invLen = len > 0.0 ? 1.0 / len : 0.0;

	float bgLuminance = dot(uBackground, vec3(0.299, 0.587, 0.114));

	float n0 = snoise3(vec3(uv * noiseScale, iTime * 0.5)) * 0.5 + 0.5;
	float r0 = mix(mix(innerRadius, 1.0, 0.4), mix(innerRadius, 1.0, 0.6), n0);
	float d0 = distance(uv, (r0 * invLen) * uv);
	float v0 = light1(1.0, 10.0, d0);

	v0 *= smoothstep(r0 * 1.05, r0, len);
	float innerFade = smoothstep(r0 * 0.8, r0 * 0.95, len);
	v0 *= mix(innerFade, 1.0, bgLuminance * 0.7);
	float cl = cos(ang + iTime * 2.0) * 0.5 + 0.5;

	float a = iTime * -1.0;
	vec2 pos = vec2(cos(a), sin(a)) * r0;
	float d = distance(uv, pos);
	float v1 = light2(1.5, 5.0, d);
	v1 *= light1(1.0, 50.0, d0);

	float v2 = smoothstep(1.0, mix(innerRadius, 1.0, n0 * 0.5), len);
	float v3 = smoothstep(innerRadius, mix(innerRadius, 1.0, 0.5), len);

	vec3 colBase = mix(color1, color2, cl);
	float fadeAmount = mix(1.0, 0.1, bgLuminance);

	vec3 darkCol = mix(color3, colBase, v0);
	darkCol = (darkCol + v1) * v2 * v3;
	darkCol = clamp(darkCol, 0.0, 1.0);

	vec3 lightCol = (colBase + v1) * mix(1.0, v2 * v3, fadeAmount);
	lightCol = mix(uBackground, lightCol, v0);
	lightCol = clamp(lightCol, 0.0, 1.0);

	vec3 finalCol = mix(darkCol, lightCol, bgLuminance);

	return extractAlpha(finalCol);
}

void main() {
	vec2 center = iResolution * 0.5;
	float size = min(iResolution.x, iResolution.y);
	vec2 fragCoord = vUv * iResolution;
	vec2 uv = (fragCoord - center) / size * 2.0;

	// Hover is the orb-global proximity of the (host-smoothed) pointer to the
	// orb center, gated OFF unless followMouse is on. The origin toggled this
	// JS-side against a 0.8 radius; a smoothstep gives the same feel, softer.
	vec2 mouseUv = (iMouse * iResolution - center) / size * 2.0;
	float hover = uFollowMouse * (1.0 - smoothstep(0.15, 0.85, length(mouseUv)));

	uv.x += hover * uHoverIntensity * 0.1 * sin(uv.y * 10.0 + iTime);
	uv.y += hover * uHoverIntensity * 0.1 * sin(uv.x * 10.0 + iTime);

	vec4 col = draw(uv);
	gl_FragColor = vec4(col.rgb * col.a, col.a);
}
`;

export function OrbBackground({
	className,
	color = "var(--fr-accent)",
	backgroundColor = "var(--fr-bg)",
	hueShift = 0,
	hoverIntensity = 0.5,
	followMouse = false,
	fps,
	renderScale,
}: OrbBackgroundProps) {
	const [orbColor, bg] = useCssColors([color, backgroundColor]);
	const uniforms = useMemo(
		() => ({
			uColor: orbColor ?? [1, 1, 1],
			uBackground: bg ?? [0, 0, 0],
			uHueShift: hueShift,
			uHoverIntensity: hoverIntensity,
			uFollowMouse: followMouse ? 1 : 0,
			iMouse: [0.5, 0.5],
		}),
		[orbColor, bg, hueShift, hoverIntensity, followMouse],
	);
	return (
		<ShaderBackground
			slot="orb-background"
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
