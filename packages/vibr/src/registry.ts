import type {
  AvatarId,
  WispPresetFactory,
  WispPresetId,
  WispPresetInstance,
} from "./types";
import {
  createBladeCursorPreset,
  createDuelCursorPreset,
  createKoiCursorPreset,
  createLanternMothCursorPreset,
  createLiquidCursorPreset,
  createPixelCursorPreset,
  createRoninCursorPreset,
  createSmileyCursorPreset,
} from "./presets";
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
    id: "liquid",
    label: "Liquid",
    description: "Organic droplet",
    create: createLiquidCursorPreset,
    kin: ["liquid"],
    universal: true,
  },
  {
    id: "koi",
    label: "Koi",
    description: "Swimming companion",
    create: createKoiCursorPreset,
    kin: ["koi"],
  },
  {
    id: "duel",
    label: "Duel",
    description: "Two tiny fighters",
    create: createDuelCursorPreset,
    kin: ["duel"],
    universal: true,
  },
  {
    id: "blade",
    label: "Blade",
    description: "Fast stream blade",
    create: createBladeCursorPreset,
    kin: ["duel"],
    universal: true,
  },
  {
    id: "ronin",
    label: "Ronin",
    description: "Wandering stream fighter",
    create: createRoninCursorPreset,
    kin: ["duel"],
    universal: true,
  },
  {
    id: "lantern-moth",
    label: "Lantern moth",
    description: "Orbiting dark familiar",
    create: createLanternMothCursorPreset,
    kin: ["blackhole"],
  },
  {
    id: "smiley",
    label: "Smiley",
    description: "Expressive face",
    create: createSmileyCursorPreset,
    kin: ["smiley"],
    universal: true,
  },
  {
    id: "pixel",
    label: "Pixel",
    description: "Morphing dot matrix",
    create: createPixelCursorPreset,
    kin: ["matrix", "lattice"],
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
    )?.id ?? "liquid"
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
