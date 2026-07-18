/**
 * SideRaysBackground — twin-hued volumetric rays fanning in from a screen corner.
 * Fraym-native port of react-bits' "SideRays" (MIT,
 * https://reactbits.dev/backgrounds/side-rays) on the shared
 * {@link ShaderBackground} host — ogl removed; the emitting corner is chosen by
 * mirroring the fragment coordinate inside the shader (uFlipX/uFlipY), so there
 * is no resolution-dependent JS placement to desync on resize.
 *
 * Theme-native: the two ray colors default to Fraym accent + iris tokens, and
 * additive light over transparency reads on light and dark surfaces alike.
 */

import { useMemo } from "react";
import { ShaderBackground, useCssColors } from "./shader-background";

export type SideRaysOrigin = "top-left" | "top-right" | "bottom-left" | "bottom-right";

export interface SideRaysBackgroundProps {
	readonly className?: string;
	/** Animation speed. Default 2.5. */
	readonly speed?: number;
	/** Primary ray color. CSS color, tokens welcome. Default the accent token. */
	readonly rayColor1?: string;
	/** Secondary ray color. CSS color, tokens welcome. Default the iris token. */
	readonly rayColor2?: string;
	/** Overall light intensity. Default 2. */
	readonly intensity?: number;
	/** Angular spread of the ray fan (higher = wider). Default 2. */
	readonly spread?: number;
	/** Corner the rays sweep from. Default "top-right". */
	readonly origin?: SideRaysOrigin;
	/** Extra rotation of the whole fan, in degrees. Default 0. */
	readonly tilt?: number;
	/** Color saturation (0 gray .. higher = punchier). Default 1.5. */
	readonly saturation?: number;
	/** Mix between the two ray colors (0 = color1, 1 = color2). Default 0.75. */
	readonly blend?: number;
	/** Distance falloff exponent (higher = tighter to the source). Default 1.6. */
	readonly falloff?: number;
	/** Overall opacity. Default 1. */
	readonly opacity?: number;
	readonly fps?: number;
	readonly renderScale?: number;
}

/** Per-corner fragment-coordinate mirror — the source's originToFlip, moved into
 *  uniforms so the corner choice lives entirely in the shader. */
const ORIGIN_FLIP: Record<SideRaysOrigin, { readonly flipX: number; readonly flipY: number }> = {
	"top-left": { flipX: 1, flipY: 0 },
	"top-right": { flipX: 0, flipY: 0 },
	"bottom-left": { flipX: 1, flipY: 1 },
	"bottom-right": { flipX: 0, flipY: 1 },
};

const FRAGMENT = `
uniform vec2 iResolution;
uniform float iTime;

uniform float uSpeed;
uniform vec3 uRayColor1;
uniform vec3 uRayColor2;
uniform float uIntensity;
uniform float uSpread;
uniform float uFlipX;
uniform float uFlipY;
uniform float uTilt;
uniform float uSaturation;
uniform float uBlend;
uniform float uFalloff;
uniform float uOpacity;

float rayStrength(vec2 raySource, vec2 rayRefDirection, vec2 coord, float seedA, float seedB, float speed) {
	vec2 sourceToCoord = coord - raySource;
	float cosAngle = dot(normalize(sourceToCoord), rayRefDirection);
	return clamp(
		(0.45 + 0.15 * sin(cosAngle * seedA + iTime * speed)) +
		(0.3 + 0.2 * cos(-cosAngle * seedB + iTime * speed)),
		0.0, 1.0) *
		clamp((iResolution.x - length(sourceToCoord)) / iResolution.x, 0.5, 1.0);
}

void main() {
	vec2 fragCoord = gl_FragCoord.xy;
	if (uFlipX > 0.5) fragCoord.x = iResolution.x - fragCoord.x;
	if (uFlipY > 0.5) fragCoord.y = iResolution.y - fragCoord.y;

	vec2 coord = vec2(fragCoord.x, iResolution.y - fragCoord.y);
	vec2 rayPos = vec2(iResolution.x * 1.1, -0.5 * iResolution.y);

	float tiltRad = uTilt * 3.14159265 / 180.0;
	float cs = cos(tiltRad);
	float sn = sin(tiltRad);
	vec2 rel = coord - rayPos;
	vec2 tiltedCoord = vec2(rel.x * cs - rel.y * sn, rel.x * sn + rel.y * cs) + rayPos;

	float halfSpread = uSpread * 0.275;
	vec2 rayRefDir1 = normalize(vec2(cos(0.785398 + halfSpread), sin(0.785398 + halfSpread)));
	vec2 rayRefDir2 = normalize(vec2(cos(0.785398 - halfSpread), sin(0.785398 - halfSpread)));

	vec4 rays1 = vec4(uRayColor1, 1.0) * rayStrength(rayPos, rayRefDir1, tiltedCoord, 36.2214, 21.11349, uSpeed);
	vec4 rays2 = vec4(uRayColor2, 1.0) * rayStrength(rayPos, rayRefDir2, tiltedCoord, 22.3991, 18.0234, uSpeed * 0.2);

	vec4 color = rays1 * (1.0 - uBlend) * 0.9 + rays2 * uBlend * 0.9;

	float distanceToLight = length(fragCoord.xy - vec2(rayPos.x, iResolution.y - rayPos.y)) / iResolution.y;
	float brightness = uIntensity * 0.4 / pow(max(distanceToLight, 0.001), uFalloff);
	color.rgb *= brightness;

	float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
	color.rgb = mix(vec3(gray), color.rgb, uSaturation);

	// Source blended straight-alpha over an opaque canvas; here we emit
	// premultiplied additive light over transparency (host blend ONE, 1-src-a).
	vec3 lit = max(color.rgb, 0.0);
	float alpha = clamp(max(lit.r, max(lit.g, lit.b)) * uOpacity, 0.0, 1.0);
	gl_FragColor = vec4(lit * alpha, alpha);
}
`;

export function SideRaysBackground({
	className,
	speed = 2.5,
	rayColor1 = "var(--fr-accent)",
	rayColor2 = "var(--fr-iris)",
	intensity = 2,
	spread = 2,
	origin = "top-right",
	tilt = 0,
	saturation = 1.5,
	blend = 0.75,
	falloff = 1.6,
	opacity = 1,
	fps,
	renderScale,
}: SideRaysBackgroundProps) {
	const [rgb1, rgb2] = useCssColors([rayColor1, rayColor2]);
	const uniforms = useMemo(() => {
		const flip = ORIGIN_FLIP[origin];
		return {
			uSpeed: speed,
			uRayColor1: rgb1 ?? [1, 1, 1],
			uRayColor2: rgb2 ?? [1, 1, 1],
			uIntensity: intensity,
			uSpread: spread,
			uFlipX: flip.flipX,
			uFlipY: flip.flipY,
			uTilt: tilt,
			uSaturation: saturation,
			uBlend: blend,
			uFalloff: falloff,
			uOpacity: opacity,
		};
	}, [speed, rgb1, rgb2, intensity, spread, origin, tilt, saturation, blend, falloff, opacity]);
	return (
		<ShaderBackground
			slot="side-rays-background"
			className={className}
			fragment={FRAGMENT}
			uniforms={uniforms}
			fps={fps}
			renderScale={renderScale}
		/>
	);
}
