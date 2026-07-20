import { describe, expect, test } from "bun:test";
import {
  compatibleWispPresets,
  resolveWispPreset,
  WispPhysics,
  wispPresetForAvatar,
} from "./index";
const dt = 1 / 60;
describe("vibr", () => {
  test("snaps only large vertical relocations", () => {
    const physics = new WispPhysics();
    physics.setTarget({ x: 0, y: 0 });
    physics.step(dt);
    physics.setTarget({ x: 800, y: 300 });
    expect(physics.step(dt)).toMatchObject({
      x: 800,
      y: 300,
      teleported: true,
    });
    expect(physics.step(dt).teleported).toBe(false);
  });
  test("springs across small moves", () => {
    const physics = new WispPhysics();
    physics.setTarget({ x: 0, y: 0 });
    physics.step(dt);
    physics.setTarget({ x: 120, y: 0 });
    expect(physics.step(dt).x).toBeWithin(0.01, 119.99);
  });
  test("resolves kin and universal presets", () => {
    expect(wispPresetForAvatar("smiley")).toBe("smiley");
    expect(resolveWispPreset("auto", "smiley")).toBe("smiley");
    // Unknown avatars fall back to the universal preset.
    expect(wispPresetForAvatar("nebula")).toBe("smiley");
    expect(
      compatibleWispPresets("nebula").some((item) => item.id === "smiley"),
    ).toBe(true);
  });
});
