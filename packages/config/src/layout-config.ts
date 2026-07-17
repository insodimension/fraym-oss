export type BenchId = "aether" | "studio" | "code";
export interface RailItemState {
  readonly id: string;
  readonly enabled?: boolean;
  readonly order?: number;
}
export type DockViewId =
  "plan" | "diff" | "files" | "tasks" | "sidebar" | "dock" | "perfHud";
export interface DockViewState {
  readonly id: DockViewId;
  readonly enabled?: boolean;
}
export interface LandingLayout {
  readonly headline?: string;
  readonly sections?: readonly string[];
  readonly deck?: readonly string[];
}
export interface BenchLayout {
  readonly rail?: readonly RailItemState[];
  readonly docks?: readonly DockViewState[];
  readonly landing?: LandingLayout;
  readonly quickActions?: readonly string[];
}
export interface LayoutConfig {
  readonly global?: BenchLayout;
  readonly benches?: Partial<Record<BenchId, BenchLayout>>;
}
export const EMPTY_BENCH_LAYOUT: BenchLayout = Object.freeze({});

function mergeById<T extends { readonly id: string }>(
  current: Map<string, T>,
  items: readonly T[] | undefined,
): void {
  for (const item of items ?? [])
    current.set(item.id, { ...current.get(item.id), ...item });
}

export function mergeBenchLayouts(
  ...layers: readonly (BenchLayout | undefined)[]
): BenchLayout {
  const rail = new Map<string, RailItemState>();
  const docks = new Map<string, DockViewState>();
  let landing: LandingLayout | undefined;
  let quickActions: readonly string[] | undefined;
  for (const layer of layers) {
    if (!layer) continue;
    mergeById(rail, layer.rail);
    mergeById(docks, layer.docks);
    if (layer.landing) landing = { ...landing, ...layer.landing };
    if (layer.quickActions) quickActions = layer.quickActions;
  }
  return {
    ...(rail.size ? { rail: [...rail.values()] } : {}),
    ...(docks.size ? { docks: [...docks.values()] } : {}),
    ...(landing ? { landing } : {}),
    ...(quickActions ? { quickActions } : {}),
  };
}

export function resolveBenchLayout({
  config,
  bench,
  preset,
  derived,
}: {
  readonly config?: LayoutConfig;
  readonly bench: BenchId;
  readonly preset?: BenchLayout;
  readonly derived?: BenchLayout;
}): BenchLayout {
  return mergeBenchLayouts(
    preset,
    config?.global,
    derived,
    config?.benches?.[bench],
  );
}
export function railItemEnabled(
  layout: BenchLayout,
  id: string,
  fallback = true,
): boolean {
  return layout.rail?.find((item) => item.id === id)?.enabled ?? fallback;
}
export function dockViewEnabled(
  layout: BenchLayout,
  id: DockViewId,
  fallback = true,
): boolean {
  return layout.docks?.find((item) => item.id === id)?.enabled ?? fallback;
}
export function sortRailItems<T extends { readonly id: string }>(
  items: readonly T[],
  layout: BenchLayout,
): readonly T[] {
  const states = new Map(layout.rail?.map((item) => [item.id, item]) ?? []);
  return items
    .filter((item) => states.get(item.id)?.enabled !== false)
    .sort(
      (left, right) =>
        (states.get(left.id)?.order ?? Number.MAX_SAFE_INTEGER) -
        (states.get(right.id)?.order ?? Number.MAX_SAFE_INTEGER),
    );
}
