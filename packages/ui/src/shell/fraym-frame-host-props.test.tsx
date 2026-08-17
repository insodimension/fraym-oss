import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { fraymBrandMarkUrl } from "../components/fraym-brand-mark";
import { SessionProvider } from "../hooks/session-provider";
import { useUsage } from "../hooks/use-usage";
import { useWorkspaceAnalytics } from "../hooks/use-workspace-analytics";
import { ThemeProvider } from "../theme/provider";
import { useEngineConfigState, useEngineResourceState } from "./engine-state";
import { FraymFrame, type FraymFrameProps } from "./fraym-frame-core";

/**
 * Host-facing frame props are threaded through several hops (FraymFrame →
 * useFraymFrameModel's workspace/rail prop objects → the chrome components), and
 * the model builds those objects behind an `as` cast that hides a dropped field
 * from the compiler. These tests render the real frame and assert on the chrome
 * the host actually gets, so a dropped hop fails instead of shipping silently.
 *
 * The drivers are absent on purpose: every provider here resolves to its real
 * no-driver state, which is enough to render the rail header and the session top
 * bar — the two surfaces under test.
 */
function FrameHarness(props: Partial<FraymFrameProps>) {
  return (
    <FraymFrame
      resources={useEngineResourceState(null, null)}
      engineConfig={useEngineConfigState(null, null)}
      analytics={useWorkspaceAnalytics(null, null)}
      usage={useUsage(null)}
      defaultAvatar="none"
      userName="Ada"
      userEmail="ada@example.com"
      planLabel="Pro"
      productLabel="Fraym"
      version="1.2.3"
      {...props}
    />
  );
}

function renderFrame(props: Partial<FraymFrameProps>): string {
  return renderToStaticMarkup(
    <ThemeProvider>
      <SessionProvider>
        <FrameHarness {...props} />
      </SessionProvider>
    </ThemeProvider>,
  );
}

// One observable marker per allowlisted top-bar action id. `jobs` is absent:
// its badge renders nothing until a session reports background work, so it has
// no static marker to assert on.
const topBarActionMarkers = [
  ["refresh", 'title="Refresh sessions"'],
  ["environment", 'title="Environment"'],
  ["dock", 'data-slot="dock-split"'],
] as const;

describe("top-bar action allowlist", () => {
  const cases = [
    { name: "no allowlist shows every action", topBarActions: undefined, shown: ["refresh", "environment", "dock"] },
    { name: "a single-id allowlist shows only that action", topBarActions: ["refresh"], shown: ["refresh"] },
    { name: "a multi-id allowlist shows exactly those actions", topBarActions: ["environment", "dock"], shown: ["environment", "dock"] },
    // The edge a `topBarActions?.length ? …` reimplementation gets wrong: an
    // empty allowlist means "expose nothing", not "fall back to everything".
    { name: "an empty allowlist shows no action", topBarActions: [], shown: [] },
  ] as const;

  for (const { name, topBarActions, shown } of cases) {
    test(name, () => {
      const html = renderFrame({ topBarActions });
      for (const [id, marker] of topBarActionMarkers) {
        expect({ id, rendered: html.includes(marker) }).toEqual({
          id,
          rendered: (shown as readonly string[]).includes(id),
        });
      }
    });
  }
});

describe("rail brand mark override", () => {
  test("falls back to the bundled Fraym mark", () => {
    expect(renderFrame({})).toContain(`src="${fraymBrandMarkUrl}"`);
  });

  test("renders the host-supplied mark instead of the bundled one", () => {
    const html = renderFrame({ brandMarkUrl: "https://host.example/logo.svg" });
    expect(html).toContain('src="https://host.example/logo.svg"');
    expect(html).not.toContain(`src="${fraymBrandMarkUrl}"`);
  });
});
