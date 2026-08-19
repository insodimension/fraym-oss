import type { EngineModelRecord, EngineProviderRecord } from "@fraym-ai/driver";
import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { type DeploymentGates, DeploymentGatesProvider } from "../deployment-gates";
import { buildCategories, type EngineModelChoice } from "./model-category-data";
import { useModelCategoryPickerState } from "./model-category-picker-state";
import type { ModelCategory } from "./model-picker";

/**
 * A single-provider host gets nothing from the model picker's aggregate groups:
 * "Current" restates a row already visible (and already checkmarked) inside its
 * provider group, and the synthetic "All available" tab restates that provider's
 * whole list. `providerGroupsOnly` drops both — and the deployment gate that
 * turns it on crosses several silently-optional hops (`DeploymentGates` field →
 * `useDeploymentGates()` read → `buildCategories` option → `allLabel: null` →
 * `ModelPicker` omitting its synthetic category). Every hop is an optional field
 * or an optional argument, so a dropped one type-checks and ships.
 *
 * These tests pin (1) that the 3-argument default is byte-identical to before
 * the option existed, (2) that the option leaves provider groups ONLY while the
 * selected model keeps the exact id `ModelPicker` compares against for its
 * checkmark, and (3) that the gate actually reaches the picker state through a
 * real render, rather than only being readable in isolation.
 */

const PROVIDER_A = "zenith";
const PROVIDER_A_NAME = "Zenith";
const PROVIDER_B = "acme";
const PROVIDER_B_NAME = "Acme";

function modelRecord(providerId: string, providerName: string, modelId: string, extra: Partial<EngineModelRecord> = {}) {
  return {
    providerId,
    providerName,
    modelId,
    label: modelId,
    available: true,
    authType: "api_key",
    reasoning: false,
    supportsImages: false,
    ...extra,
  } satisfies EngineModelRecord;
}

function providerRecord(id: string, name: string): EngineProviderRecord {
  return {
    id,
    name,
    hasAuth: true,
    authType: "api_key",
    authSource: "env",
    oauthSupported: false,
    apiKeySetupSupported: true,
  };
}

// `providers` order is deliberately the REVERSE of the providers' alphabetical
// name order, so any assertion on group order fails if the caller-supplied order
// stops being honoured and the alphabetical fallback takes over.
const PROVIDERS = [providerRecord(PROVIDER_A, PROVIDER_A_NAME), providerRecord(PROVIDER_B, PROVIDER_B_NAME)];
const MODELS = [
  modelRecord(PROVIDER_A, PROVIDER_A_NAME, "z-mini", { reasoning: true }),
  modelRecord(PROVIDER_B, PROVIDER_B_NAME, "a-basic"),
  modelRecord(PROVIDER_B, PROVIDER_B_NAME, "a-vision", { supportsImages: true }),
];
const SELECTED: EngineModelChoice = { provider: PROVIDER_A, modelId: "z-mini" };
/** The id `ModelPicker` uses as `selectedId` (`model.id ?? model.name`). */
const SELECTED_ID = `${SELECTED.provider}/${SELECTED.modelId}`;

const idsOf = (categories: readonly ModelCategory[]): string[] => categories.map(entry => entry.id);

function category(categories: readonly ModelCategory[], id: string): ModelCategory {
  const found = categories.find(entry => entry.id === id);
  if (!found) throw new Error(`missing category ${id}: got ${idsOf(categories).join(", ")}`);
  return found;
}

describe("buildCategories default grouping", () => {
  test("keeps the current, provider and capability groups in order when no option is passed", () => {
    expect(idsOf(buildCategories(MODELS, SELECTED, PROVIDERS))).toEqual([
      "current",
      `provider:${PROVIDER_A}`,
      `provider:${PROVIDER_B}`,
      "capability:reasoning",
      "capability:vision",
    ]);
  });

  test("an absent, empty, or false option produces the identical category tree", () => {
    const bare = buildCategories(MODELS, SELECTED, PROVIDERS);

    expect(buildCategories(MODELS, SELECTED, PROVIDERS, {})).toEqual(bare);
    expect(buildCategories(MODELS, SELECTED, PROVIDERS, { providerGroupsOnly: false })).toEqual(bare);
  });
});

describe("buildCategories providerGroupsOnly", () => {
  test("drops the current and capability aggregates, keeping caller-supplied provider order", () => {
    expect(idsOf(buildCategories(MODELS, SELECTED, PROVIDERS, { providerGroupsOnly: true }))).toEqual([
      `provider:${PROVIDER_A}`,
      `provider:${PROVIDER_B}`,
    ]);
  });

  test("the selected model survives inside its provider group under the id the picker checkmarks", () => {
    const categories = buildCategories(MODELS, SELECTED, PROVIDERS, { providerGroupsOnly: true });
    const group = category(categories, `provider:${PROVIDER_A}`);
    const selectedItem = group.items.find(item => (item.id ?? item.name) === SELECTED_ID);

    expect(selectedItem).toBeDefined();
    expect(selectedItem?.id).toBe(SELECTED_ID);
  });

  test("a single-provider deployment collapses to exactly one category", () => {
    const soloModels = MODELS.filter(model => model.providerId === PROVIDER_B);
    const categories = buildCategories(soloModels, { provider: PROVIDER_B, modelId: "a-basic" }, [PROVIDERS[1]!], {
      providerGroupsOnly: true,
    });

    expect(idsOf(categories)).toEqual([`provider:${PROVIDER_B}`]);
    expect(categories[0]?.items.map(item => item.id)).toEqual([`${PROVIDER_B}/a-basic`, `${PROVIDER_B}/a-vision`]);
  });
});

function CategoryProbe() {
  const state = useModelCategoryPickerState({
    models: MODELS,
    providers: PROVIDERS,
    selected: SELECTED,
    placeholder: "Select a model",
    disabled: false,
    loading: false,
    onSelect: () => {},
  });
  return <span>{`${idsOf(state.categories).join(",")}|${String(state.allLabel)}`}</span>;
}

function probe(value: DeploymentGates): { readonly ids: string; readonly allLabel: string } {
  const markup = renderToStaticMarkup(
    <DeploymentGatesProvider value={value}>
      <CategoryProbe />
    </DeploymentGatesProvider>,
  );
  const text = markup.replace(/<[^>]*>/g, "");
  const [ids = "", allLabel = ""] = text.split("|");
  return { ids, allLabel };
}

describe("modelPickerGroups gate reaches the picker state", () => {
  test("no gate keeps every group and the synthetic All available tab", () => {
    const { ids, allLabel } = probe({});

    expect(ids).toBe(
      ["current", `provider:${PROVIDER_A}`, `provider:${PROVIDER_B}`, "capability:reasoning", "capability:vision"].join(
        ",",
      ),
    );
    expect(allLabel).toBe("All available");
  });

  test("providers-only leaves provider groups only and omits the All available tab", () => {
    const { ids, allLabel } = probe({ modelPickerGroups: "providers-only" });

    expect(ids).toBe([`provider:${PROVIDER_A}`, `provider:${PROVIDER_B}`].join(","));
    // `null` is what makes ModelPicker skip appending its synthetic category.
    expect(allLabel).toBe("null");
  });
});
