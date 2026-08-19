import type { EngineModelRecord, EngineProviderRecord } from "@fraym-ai/driver";
import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { providerBrand } from "../settings/provider-brand";
import { modelSelectionFromConfig } from "../shell/shell-data";
import { buildCategories } from "./model-category-data";
import type { ModelCategory, ModelDef } from "./model-picker";
import { ProviderBrandIcon } from "./provider-brand-icon";

/**
 * A host-supplied provider logo travels through several independent hops — model
 * record → `ModelDef`/`ModelCategory`, provider record → category heading,
 * session config → composer chip, and brand resolution → rendered `<img>`. Every
 * hop is an optional spread, so a dropped one type-checks and ships silently.
 * These tests pin each hop's observable output, and pin the no-logo path to the
 * exact shape it had before the feature so existing consumers cannot drift.
 */

const LOGO = "/brand/yarin.svg";
// Deliberately absent from the built-in brand table, so the no-logo path
// resolves to a monogram and a host logo has something to visibly beat.
const PROVIDER_ID = "hosted-gateway";
const PROVIDER_NAME = "Yarin Gateway";

function modelRecord(modelId: string, extra: Partial<EngineModelRecord> = {}): EngineModelRecord {
  return {
    providerId: PROVIDER_ID,
    providerName: PROVIDER_NAME,
    modelId,
    label: modelId,
    available: true,
    authType: "api_key",
    reasoning: false,
    supportsImages: false,
    ...extra,
  };
}

function providerRecord(extra: Partial<EngineProviderRecord> = {}): EngineProviderRecord {
  return {
    id: PROVIDER_ID,
    name: PROVIDER_NAME,
    hasAuth: true,
    authType: "api_key",
    authSource: "env",
    oauthSupported: false,
    apiKeySetupSupported: true,
    ...extra,
  };
}

function category(categories: readonly ModelCategory[], id: string): ModelCategory {
  const found = categories.find(entry => entry.id === id);
  if (!found) throw new Error(`missing category ${id}: got ${categories.map(entry => entry.id).join(", ")}`);
  return found;
}

const logosOf = (items: readonly ModelDef[]): (string | undefined)[] => items.map(item => item.providerLogoUrl);

describe("buildCategories host-logo threading", () => {
  const models = [modelRecord("yarin-free", { logoUrl: LOGO }), modelRecord("yarin-pro", { logoUrl: LOGO })];
  const selected = { provider: PROVIDER_ID, modelId: "yarin-free" };

  test("brands the provider heading and every model row from the model records", () => {
    const categories = buildCategories(models, selected, [providerRecord()]);
    const provider = category(categories, `provider:${PROVIDER_ID}`);

    expect(provider.providerLogoUrl).toBe(LOGO);
    expect(logosOf(provider.items)).toEqual([LOGO, LOGO]);
  });

  test("brands the current-selection row", () => {
    const current = category(buildCategories(models, selected, [providerRecord()]), "current");

    expect(current.items.map(item => item.id)).toEqual([`${PROVIDER_ID}/yarin-free`]);
    expect(logosOf(current.items)).toEqual([LOGO]);
  });

  test("falls back to the provider record's logo for the heading when no model carries one", () => {
    const bare = [modelRecord("yarin-free"), modelRecord("yarin-pro")];
    const provider = category(
      buildCategories(bare, selected, [providerRecord({ logoUrl: LOGO })]),
      `provider:${PROVIDER_ID}`,
    );

    // The heading gets the provider-record logo; rows stay unbranded because the
    // records they are built from carry none.
    expect(provider.providerLogoUrl).toBe(LOGO);
    expect(logosOf(provider.items)).toEqual([undefined, undefined]);
  });

  test("leaves headings and rows unbranded when neither records nor providers carry a logo", () => {
    const bare = [modelRecord("yarin-free"), modelRecord("yarin-pro")];
    const categories = buildCategories(bare, selected, [providerRecord()]);
    const provider = category(categories, `provider:${PROVIDER_ID}`);
    const current = category(categories, "current");

    expect(provider.providerLogoUrl).toBeUndefined();
    expect("providerLogoUrl" in provider).toBe(false);
    for (const item of [...provider.items, ...current.items]) {
      expect(item.providerLogoUrl).toBeUndefined();
      expect("providerLogoUrl" in item).toBe(false);
    }
  });
});

describe("providerBrand logo precedence", () => {
  test("a host logo outranks the monogram fallback", () => {
    expect(providerBrand(PROVIDER_ID, PROVIDER_NAME).logoUrl).toBeUndefined();
    expect(providerBrand(PROVIDER_ID, PROVIDER_NAME, undefined, LOGO).logoUrl).toBe(LOGO);
  });

  test("a host logo replaces a built-in asset and its monochrome filter", () => {
    const builtIn = providerBrand("openai", "OpenAI");
    const hosted = providerBrand("openai", "OpenAI", undefined, LOGO);

    expect(builtIn.logoUrl).not.toBe(LOGO);
    expect(hosted.logoUrl).toBe(LOGO);
    expect(hosted.logoFilter).toBeUndefined();
  });

  test("an explicit custom logo outranks the host logo", () => {
    expect(providerBrand(PROVIDER_ID, PROVIDER_NAME, { logoUrl: "/brand/custom.svg" }, LOGO).logoUrl).toBe(
      "/brand/custom.svg",
    );
  });

  test("a blank custom logo yields to the host logo", () => {
    expect(providerBrand(PROVIDER_ID, PROVIDER_NAME, { logoUrl: "   " }, LOGO).logoUrl).toBe(LOGO);
  });

  test("supplying neither is identical to the pre-existing two-argument call", () => {
    expect(providerBrand(PROVIDER_ID, PROVIDER_NAME, undefined, undefined)).toEqual(
      providerBrand(PROVIDER_ID, PROVIDER_NAME),
    );
    expect(providerBrand("openai", "OpenAI", undefined, undefined)).toEqual(providerBrand("openai", "OpenAI"));
  });
});

describe("ProviderBrandIcon logo rendering", () => {
  test("renders the host logo as an image source", () => {
    const html = renderToStaticMarkup(
      <ProviderBrandIcon providerId={PROVIDER_ID} providerName={PROVIDER_NAME} logoUrl={LOGO} />,
    );

    expect(html).toContain(`<img`);
    expect(html).toContain(`src="${LOGO}"`);
  });

  test("renders the monogram and no image when no logo resolves", () => {
    const html = renderToStaticMarkup(<ProviderBrandIcon providerId={PROVIDER_ID} providerName={PROVIDER_NAME} />);

    expect(html).not.toContain("<img");
    expect(html).toContain(">YG<");
  });
});

describe("modelSelectionFromConfig host branding gate", () => {
  const config = { provider: PROVIDER_ID, modelId: "Yarin/yarin-free", thinkingLevel: "default" };
  const branded = modelRecord("Yarin/yarin-free", { providerName: "Yarin", logoUrl: LOGO });

  test("shows the bare model name plus the host logo when the bound record carries one", () => {
    expect(modelSelectionFromConfig(config, [branded])).toEqual({
      name: "yarin-free",
      effort: "default",
      logoUrl: LOGO,
      providerId: PROVIDER_ID,
      providerName: "Yarin",
    });
  });

  const unbranded = [
    { name: "the matching record carries no logo", models: [modelRecord("Yarin/yarin-free")] },
    { name: "no records are supplied at all", models: undefined },
    // Guards the provider check: a logo belonging to a different provider must
    // not brand this session, even though the model id matches.
    {
      name: "the only logo-bearing record belongs to another provider",
      models: [modelRecord("Yarin/yarin-free", { providerId: "other-gateway", logoUrl: LOGO })],
    },
  ] as const;

  for (const { name, models } of unbranded) {
    test(`keeps the full model id and no logo when ${name}`, () => {
      const selection = modelSelectionFromConfig(config, models);

      expect(selection).toEqual({ name: "Yarin/yarin-free", effort: "default" });
      expect(selection?.logoUrl).toBeUndefined();
      expect(selection && "logoUrl" in selection).toBe(false);
    });
  }
});
