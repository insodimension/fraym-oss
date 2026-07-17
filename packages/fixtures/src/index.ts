export * from "./catalog";
export * from "./data";
import { createScriptedDriver } from "@fraym/driver/mock";
import { DEMO_SCRIPTS } from "./catalog";
export const createMemoryDemoDriver = (options?: { readonly speed?: number }) =>
  createScriptedDriver({
    ...DEMO_SCRIPTS.memory,
    ...(options?.speed === undefined ? {} : { speed: options.speed }),
  });
