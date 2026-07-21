import type {
  EngineConfigCatalog,
  EngineConfigChangeListener,
  EngineConfigDriver,
  EngineConfigSnapshot,
  WorkspaceRef,
} from "@fraym-ai/driver";
export interface ReferenceConfigDriverOptions {
  readonly withSubscriptions?: boolean;
}
export interface ReferenceConfigHarness {
  readonly config: EngineConfigDriver;
  readonly writableProbe: { readonly path: string; readonly value: unknown };
  triggerExternalChange(path: string, value: unknown): void;
}
const records = [
  {
    path: "agent.model",
    label: "Model",
    group: "Agent",
    type: "string",
    control: "text",
    defaultValue: "default/model",
    writable: true,
    source: "reference",
  },
  {
    path: "ui.theme",
    label: "Theme",
    group: "Appearance",
    type: "enum",
    control: "select",
    defaultValue: "dark",
    options: [
      { value: "dark", label: "Dark" },
      { value: "light", label: "Light" },
    ],
    writable: true,
    source: "reference",
  },
] as const satisfies EngineConfigCatalog["records"];
export function createReferenceConfigDriver(
  options: ReferenceConfigDriverOptions = {},
): ReferenceConfigHarness {
  const overrides = new Map<string, unknown>();
  const listeners = new Set<EngineConfigChangeListener>();
  const notify = (path: string) =>
    listeners.forEach((listener) => listener({ keys: [path] }));
  const snapshot = (workspace: WorkspaceRef): EngineConfigSnapshot => ({
    workspace,
    values: records.map((item) => ({
      path: item.path,
      value: overrides.get(item.path) ?? item.defaultValue,
      defaultValue: item.defaultValue,
      scope: overrides.has(item.path) ? "global" : "default",
      changed: overrides.has(item.path),
    })),
  });
  const base = {
    async getConfigCatalog() {
      return {
        engineId: "reference",
        engineFamily: "reference",
        configDialect: "reference",
        records,
      };
    },
    async getConfigSnapshot(workspace: WorkspaceRef) {
      return snapshot(workspace);
    },
    async setConfigValue(
      workspace: WorkspaceRef,
      path: string,
      value: unknown,
    ) {
      if (!records.some((item) => item.path === path))
        throw new Error(`Unknown config path: ${path}`);
      overrides.set(path, value);
      notify(path);
      return snapshot(workspace);
    },
    async resetConfigValue(workspace: WorkspaceRef, path: string) {
      overrides.delete(path);
      notify(path);
      return snapshot(workspace);
    },
  };
  const config: EngineConfigDriver =
    options.withSubscriptions === false
      ? base
      : {
          ...base,
          subscribeConfigChanges(listener) {
            listeners.add(listener);
            return () => listeners.delete(listener);
          },
        };
  return {
    config,
    writableProbe: { path: "ui.theme", value: "light" },
    triggerExternalChange(path, value) {
      overrides.set(path, value);
      notify(path);
    },
  };
}
