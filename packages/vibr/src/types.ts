export type AvatarId = "nebula" | "smiley" | "none";
export type AvatarState = "idle" | "thinking" | "typing";
export type AvatarMode =
  "" | "search" | "read" | "run" | "edit" | "skill" | "mcp" | "think";
export interface AvatarProps {
  readonly state?: AvatarState;
  readonly mode?: AvatarMode;
  readonly energy?: number;
  readonly className?: string;
}
export interface WispTarget {
  readonly x: number;
  readonly y: number;
}
export interface WispTargetRef {
  current: WispTarget | null;
}
export interface SceneryLabel {
  readonly id?: string;
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly px: number;
}
export interface SceneryRect {
  readonly id?: string;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly kind: "card" | "block";
  readonly labels?: readonly SceneryLabel[];
}
export interface GlyphRect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}
export type BreakTextFn = (
  labelId: string,
  index: number,
) => GlyphRect | undefined;
export type BreakCardFn = (
  rectId: string,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
) => boolean;
export interface WispSceneryRef {
  current: readonly SceneryRect[];
}
export type WispPresetId = "smiley";
export interface WispFrame {
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
  readonly speed: number;
  readonly angle: number;
  readonly stretch: number;
  readonly squash: number;
  readonly impact: number;
  readonly falling: boolean;
  readonly warp: number;
  readonly skid: number;
  readonly settled: boolean;
  readonly targetX: number;
  readonly targetY: number;
  readonly teleported: boolean;
}
export interface WispEnv {
  readonly t: number;
  readonly dt: number;
  readonly energy: number;
  readonly state: AvatarState;
  readonly mode: AvatarMode;
  readonly dpr: number;
  readonly width: number;
  readonly height: number;
  readonly opacity: number;
  readonly scenery?: readonly SceneryRect[];
  readonly breakText?: BreakTextFn;
  readonly breakCard?: BreakCardFn;
}
export interface WispPresetInstance {
  draw(ctx: CanvasRenderingContext2D, frame: WispFrame, env: WispEnv): void;
}
export type WispPresetFactory = () => WispPresetInstance;
export interface WispPhysicsOptions {
  readonly stiffness?: number;
  readonly damping?: number;
  readonly dropThreshold?: number;
  readonly gravity?: number;
  readonly teleportThreshold?: number;
  readonly maxStretch?: number;
  readonly wrapThreshold?: number;
}
export interface WispProps {
  readonly preset?: WispPresetId;
  readonly targetRef: WispTargetRef;
  readonly sceneryRef?: WispSceneryRef;
  readonly breakText?: BreakTextFn;
  readonly breakCard?: BreakCardFn;
  readonly energy?: number;
  readonly state?: AvatarState;
  readonly mode?: AvatarMode;
  readonly zIndex?: number;
  readonly className?: string;
  readonly physics?: WispPhysicsOptions;
}
export type CursorTarget = WispTarget;
export type CursorTargetRef = WispTargetRef;
export type CursorSceneryRef = WispSceneryRef;
export type CursorPresetId = WispPresetId;
export type CursorFrame = WispFrame;
export type CursorEnv = WispEnv;
export type CursorPresetInstance = WispPresetInstance;
export type CursorPresetFactory = WispPresetFactory;
export type CursorProps = WispProps;
