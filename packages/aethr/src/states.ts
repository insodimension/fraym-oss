import type { ThemeName } from "./themes";
export type AethrState =
  "idle" | "nudge" | "dreaming" | "uncertain" | "satisfied";
export interface AethrParams {
  readonly theme: ThemeName;
  readonly bloomStrength: number;
  readonly breathSpeed: number;
  readonly breathDepth: number;
  readonly breathBloom: number;
  readonly rotationSpeed: number;
  readonly grainStrength: number;
  readonly flare?: number;
}
export const AETHR_STATES: Record<AethrState, AethrParams> = {
  idle: {
    theme: "amber",
    bloomStrength: 0.05,
    breathSpeed: 1.5,
    breathDepth: 0.05,
    breathBloom: 0.6,
    rotationSpeed: 0.04,
    grainStrength: 0.035,
  },
  nudge: {
    theme: "amber",
    bloomStrength: 0.09,
    breathSpeed: 2.6,
    breathDepth: 0.06,
    breathBloom: 1.1,
    rotationSpeed: 0.06,
    grainStrength: 0.035,
    flare: 0.5,
  },
  dreaming: {
    theme: "twilight",
    bloomStrength: 0.11,
    breathSpeed: 0.8,
    breathDepth: 0.09,
    breathBloom: 0.9,
    rotationSpeed: 0.08,
    grainStrength: 0.04,
  },
  uncertain: {
    theme: "abyss",
    bloomStrength: 0.03,
    breathSpeed: 1.1,
    breathDepth: 0.025,
    breathBloom: 0.35,
    rotationSpeed: 0.02,
    grainStrength: 0.05,
  },
  satisfied: {
    theme: "sunset",
    bloomStrength: 0.07,
    breathSpeed: 1.7,
    breathDepth: 0.06,
    breathBloom: 0.8,
    rotationSpeed: 0.05,
    grainStrength: 0.035,
    flare: 0.7,
  },
};
