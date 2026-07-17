export const vertexShader = `
attribute vec2 a_position;
varying vec2 v_uv;
void main() { v_uv = a_position * .5 + .5; gl_Position = vec4(a_position, 0., 1.); }
`;

export const fragmentShader = `
precision highp float;
varying vec2 v_uv;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform vec2 u_center;
uniform vec2 u_size;
uniform vec2 u_mapScale;
uniform vec2 u_mapOffset;
uniform float u_radius;
uniform float u_depth;
uniform float u_refraction;
uniform float u_blur;
uniform float u_chroma;
uniform float u_distortion;
uniform float u_edge;
uniform float u_specular;
uniform float u_fresnel;
uniform float u_brightness;
uniform float u_saturation;
uniform float u_dark;
uniform float u_tintStrength;
uniform vec3 u_tintColor;
uniform float u_tint;
uniform float u_opacity;
uniform float u_bevel;
uniform float u_pressed;

float roundedBox(vec2 point, vec2 halfSize, float radius) {
  vec2 delta = abs(point) - halfSize + radius;
  return length(max(delta, 0.)) + min(max(delta.x, delta.y), 0.) - radius;
}
float grain(vec2 point) { return fract(sin(dot(point, vec2(12.9898, 78.233))) * 43758.5453); }
vec3 glassSample(vec2 point, vec2 spread) {
  vec3 center = texture2D(u_texture, point).rgb;
  vec3 cross = texture2D(u_texture, point + vec2(spread.x, 0.)).rgb
    + texture2D(u_texture, point - vec2(spread.x, 0.)).rgb
    + texture2D(u_texture, point + vec2(0., spread.y)).rgb
    + texture2D(u_texture, point - vec2(0., spread.y)).rgb;
  return mix(center, (center * 2. + cross) / 6., clamp(u_blur, 0., 1.));
}

void main() {
  vec2 pixel = v_uv * u_resolution;
  vec2 local = pixel - u_center;
  vec2 halfSize = u_size * .5;
  float distance = roundedBox(local, halfSize, min(u_radius, min(halfSize.x, halfSize.y)));
  float coverage = 1. - smoothstep(-1., 1.5, distance);
  if (coverage <= 0.) discard;
  vec2 normal = normalize(local / max(halfSize, vec2(1.)) + vec2(.0001));
  float rim = smoothstep(-max(3., u_depth * .3), 1., distance);
  float dome = mix(1., max(0., 1. - dot(local / max(halfSize, vec2(1.)), local / max(halfSize, vec2(1.)))), u_bevel);
  float jitter = (grain(pixel) - .5) * u_distortion;
  vec2 bend = normal * (u_refraction * .018 * (rim + .25) + jitter) * dome;
  bend *= mix(1., .8, u_pressed);
  vec2 mapped = u_mapOffset + v_uv * u_mapScale;
  vec3 color;
  vec2 blurSpread = vec2(.0035) * u_blur;
  color.r = glassSample(mapped + bend * (1. + u_chroma), blurSpread).r;
  color.g = glassSample(mapped + bend, blurSpread).g;
  color.b = glassSample(mapped + bend * (1. - u_chroma), blurSpread).b;
  float luminance = dot(color, vec3(.2126, .7152, .0722));
  color = mix(vec3(luminance), color, 1. + u_saturation);
  color *= 1. - u_dark;
  color = mix(color, color * u_tintColor, u_tintStrength);
  color += u_brightness + u_tint;
  float light = pow(max(0., dot(normalize(vec2(-.65, -.75)), -normal)), 9.) * u_specular;
  color += light + rim * (u_edge + u_fresnel * .12);
  gl_FragColor = vec4(color, coverage * u_opacity);
}
`;
