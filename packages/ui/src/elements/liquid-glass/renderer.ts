import type { LiquidGlassSettings } from "./settings";
import { fragmentShader, vertexShader } from "./shaders";

export interface LiquidGlassFieldSource { readonly canvas: HTMLCanvasElement; readonly backgroundEl: HTMLElement }

const uniforms = ["resolution", "center", "size", "mapScale", "mapOffset", "radius", "depth", "refraction", "blur", "chroma", "distortion", "edge", "specular", "fresnel", "brightness", "saturation", "dark", "tintStrength", "tintColor", "tint", "opacity", "bevel", "pressed"] as const;
type Uniform = typeof uniforms[number];

export class LiquidGlassRenderer {
  private readonly gl: WebGLRenderingContext;
  private readonly texture: WebGLTexture;
  private readonly locations = {} as Record<Uniform, WebGLUniformLocation | null>;
  private settings: LiquidGlassSettings;
  private center = { x: 0, y: 0 };
  private stretch = 0;
  private pressed = false;
  private morph = 1;
  private animating = true;
  private disposed = false;
  private frame = 0;

  constructor(private readonly canvas: HTMLCanvasElement, private readonly source: LiquidGlassFieldSource, settings: LiquidGlassSettings) {
    const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: false, antialias: false });
    if (!gl) throw new Error("Liquid glass needs WebGL.");
    this.gl = gl; this.settings = settings;
    const compile = (kind: number, sourceCode: string) => {
      const shader = gl.createShader(kind);
      if (!shader) throw new Error("Unable to create liquid glass shader.");
      gl.shaderSource(shader, sourceCode); gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? "Liquid glass shader compilation failed.");
      return shader;
    };
    const program = gl.createProgram();
    if (!program) throw new Error("Unable to create liquid glass program.");
    gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexShader)); gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentShader)); gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? "Liquid glass program linking failed.");
    gl.useProgram(program);
    const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "a_position"); gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    for (const name of uniforms) this.locations[name] = gl.getUniformLocation(program, `u_${name}`);
    const texture = gl.createTexture(); if (!texture) throw new Error("Unable to create liquid glass texture.");
    this.texture = texture; gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.uniform1i(gl.getUniformLocation(program, "u_texture"), 0);
    const tick = () => { if (this.disposed) return; if (this.animating) this.draw(); this.frame = requestAnimationFrame(tick); };
    this.frame = requestAnimationFrame(tick);
  }
  setSettings(settings: LiquidGlassSettings) { this.settings = settings; this.draw(); }
  setGeometry(x: number, y: number, stretch: number, pressed: boolean, morph = 1, _materialMorph = 1, _button = 0) {
    this.center = { x, y }; this.stretch = stretch; this.pressed = pressed; this.morph = Math.max(0, Math.min(1, morph)); this.draw();
  }
  setAnimating(animating: boolean) { this.animating = animating; if (!animating) this.draw(); }
  resize(width: number, height: number) {
    const scale = Math.min(4, Math.max(devicePixelRatio || 1, height <= 80 ? 3 : height <= 140 ? 2.5 : 2));
    this.canvas.width = Math.max(1, Math.round(width * scale)); this.canvas.height = Math.max(1, Math.round(height * scale));
    this.canvas.style.width = `${width}px`; this.canvas.style.height = `${height}px`; this.draw();
  }
  dispose() { this.disposed = true; cancelAnimationFrame(this.frame); this.gl.deleteTexture(this.texture); this.gl.getExtension("WEBGL_lose_context")?.loseContext(); }
  draw() {
    if (this.disposed || !this.canvas.width || !this.source.canvas.width) return;
    const gl = this.gl; const s = this.settings; const ratio = this.canvas.width / Math.max(1, this.canvas.clientWidth);
    gl.bindTexture(gl.TEXTURE_2D, this.texture); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.source.canvas);
    const rect = this.canvas.getBoundingClientRect(); const background = this.source.backgroundEl.getBoundingClientRect();
    const width = Math.max(1, background.width); const height = Math.max(1, background.height);
    const lensWidth = (34 + (s.lensWidth - 34) * this.morph) * (1 + this.stretch);
    const lensHeight = (22 + (s.lensHeight - 22) * this.morph) * (1 - this.stretch * .48);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(this.locations.resolution, this.canvas.width, this.canvas.height);
    gl.uniform2f(this.locations.center, this.center.x * ratio, this.center.y * ratio);
    gl.uniform2f(this.locations.size, lensWidth * ratio, lensHeight * ratio);
    gl.uniform2f(this.locations.mapScale, rect.width / width, rect.height / height);
    gl.uniform2f(this.locations.mapOffset, (rect.left - background.left) / width, (background.bottom - rect.bottom) / height);
    gl.uniform1f(this.locations.radius, s.radius * ratio); gl.uniform1f(this.locations.depth, s.depth * ratio);
    gl.uniform1f(this.locations.refraction, s.refraction); gl.uniform1f(this.locations.blur, s.blur); gl.uniform1f(this.locations.chroma, s.chromaticAberration);
    gl.uniform1f(this.locations.distortion, s.distortion); gl.uniform1f(this.locations.edge, s.edgeHighlight);
    gl.uniform1f(this.locations.specular, s.specular); gl.uniform1f(this.locations.fresnel, s.fresnel);
    gl.uniform1f(this.locations.brightness, s.brightness); gl.uniform1f(this.locations.saturation, s.saturation);
    gl.uniform1f(this.locations.dark, s.darkTint); gl.uniform1f(this.locations.tintStrength, s.tintStrength);
    gl.uniform3f(this.locations.tintColor, ...s.tintColor); gl.uniform1f(this.locations.tint, s.tint);
    gl.uniform1f(this.locations.opacity, s.opacity); gl.uniform1f(this.locations.bevel, s.bevel);
    gl.uniform1f(this.locations.pressed, this.pressed ? 1 : 0); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
}
