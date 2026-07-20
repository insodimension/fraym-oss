import type {
  AvatarId,
  WispPresetFactory,
  WispPresetId,
  WispPresetInstance,
} from "./types";
import { createSmileyCursorPreset } from "./presets";
export interface WispPresetDef {
  readonly id: WispPresetId;
  readonly label: string;
  readonly description: string;
  readonly create: WispPresetFactory;
  readonly kin: readonly AvatarId[];
  readonly universal?: boolean;
}
export const WISP_PRESET_DEFS: readonly WispPresetDef[] = [
  {
    id: "smiley",
    label: "Smiley",
    description: "Expressive face",
    create: createSmileyCursorPreset,
    kin: ["smiley"],
    universal: true,
  },
];
export function wispPresetDef(id: string): WispPresetDef | undefined {
  return WISP_PRESET_DEFS.find((item) => item.id === id);
}
export function createWispPreset(id: WispPresetId): WispPresetInstance {
  return (wispPresetDef(id) ?? WISP_PRESET_DEFS[0]!).create();
}
export function compatibleWispPresets(
  avatar: string,
): readonly WispPresetDef[] {
  return WISP_PRESET_DEFS.filter(
    (item) => item.universal || item.kin.includes(avatar as AvatarId),
  );
}
export function wispPresetForAvatar(avatar: string): WispPresetId {
  return (
    (
      WISP_PRESET_DEFS.find((item) => item.kin.includes(avatar as AvatarId)) ??
      WISP_PRESET_DEFS.find((item) => item.universal)
    )?.id ?? "smiley"
  );
}
export function resolveWispPreset(
  setting: string,
  avatar: string,
): WispPresetId {
  const chosen = setting !== "auto" ? wispPresetDef(setting) : undefined;
  return chosen && (chosen.universal || chosen.kin.includes(avatar as AvatarId))
    ? chosen.id
    : wispPresetForAvatar(avatar);
}
export const CURSOR_PRESET_DEFS = WISP_PRESET_DEFS;
export type CursorPresetDef = WispPresetDef;
export const cursorPresetDef = wispPresetDef;
export const createCursorPreset = createWispPreset;
export const compatibleCursorPresets = compatibleWispPresets;
export const cursorPresetForAvatar = wispPresetForAvatar;
export const resolveCursorPreset = resolveWispPreset;
