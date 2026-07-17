import { Aethr, CinematicText } from "@fraym/aethr";
import { DEFAULT_FRAYM_UI_CONFIG, resolveFraymUiConfig } from "@fraym/config";
import { createReplayDriverHarness } from "@fraym/driver-test/replay-driver";
import { DEMO_SCRIPTS } from "@fraym/fixtures";
import { Badge, Code, THEME_PRESETS, useTheme } from "@fraym/ui";
import { resolveVerber } from "@fraym/verber";
import { Presence } from "@fraym/vibr";
import type { Entry } from "../entry";

function ThemeDemo() {
  const { preset, resolvedMode } = useTheme();
  return (
    <div className="sink-package-demo">
      <Badge tone="accent">{resolvedMode}</Badge>
      <h3>{preset}</h3>
      <div className="sink-theme-grid">
        {THEME_PRESETS.map((theme) => (
          <article key={theme.id} style={{ borderColor: theme.dark.accent }}>
            <strong>{theme.name}</strong>
            <small>{theme.note}</small>
          </article>
        ))}
      </div>
    </div>
  );
}
function ConfigDemo() {
  const config = resolveFraymUiConfig({
    density: "compact",
    themeMode: "system",
  });
  return (
    <div className="sink-package-demo">
      <Badge>{config.density}</Badge>
      <Code block>
        {JSON.stringify(
          {
            themeMode: config.themeMode,
            toolOutputDefault: config.toolOutputDefault,
            settings: Object.keys(DEFAULT_FRAYM_UI_CONFIG).length,
          },
          null,
          2,
        )}
      </Code>
    </div>
  );
}
function FixturesDemo() {
  return (
    <div className="sink-package-demo">
      <strong>
        {Object.keys(DEMO_SCRIPTS).length} deterministic session scripts
      </strong>
      <p>
        Read, edit, search, approvals, tools, memory, and long-form transcripts
        share one typed fixture factory.
      </p>
    </div>
  );
}
function DriverTestDemo() {
  const harness = createReplayDriverHarness();
  return (
    <div className="sink-package-demo">
      <Badge tone="success">Replay ready</Badge>
      <Code>{harness.workspace.path}</Code>
      <p>
        Conformance and replay helpers exercise lifecycle, delivery lanes,
        journals, and configuration.
      </p>
    </div>
  );
}
function VerberDemo() {
  return (
    <div className="sink-package-demo">
      <strong>
        {
          resolveVerber({
            profile: "expressive",
            phase: "tool",
            toolName: "search",
          }).text
        }
      </strong>
      <p>
        Working language resolves from driver status, intent, tool kind, phase,
        and profile.
      </p>
    </div>
  );
}
function VibrDemo() {
  return (
    <div className="sink-package-demo sink-presence-grid">
      {(["blob", "rorschach", "aurora", "smiley"] as const).map((avatar) => (
        <div key={avatar}>
          <Presence
            avatar={avatar}
            className="sink-presence-avatar"
            state="thinking"
          />
          <small>{avatar}</small>
        </div>
      ))}
    </div>
  );
}
function AethrDemo() {
  return (
    <div className="sink-aethr-demo">
      <Aethr state="nudge" />
      <CinematicText caption="Cinematic presence">
        The interface can breathe.
      </CinematicText>
    </div>
  );
}

function showcase(
  id: string,
  title: string,
  description: string,
  importCode: string,
  Demo: Entry["Demo"],
): Entry {
  return {
    id,
    title,
    group: id === "theme-engine" ? "tokens" : "features",
    tier: "Package",
    description,
    importCode,
    Demo,
    knobs: [],
    code: () => importCode,
    examples: [
      { title: "Package contract", description, code: importCode },
      {
        title: "Composable by default",
        description:
          "Use the public contract without coupling the host to its implementation.",
        code: importCode,
      },
    ],
    props: [
      {
        name: "contract",
        type: "package export",
        defaultValue: "public",
        description,
      },
    ],
  };
}

export const packageEntries = [
  showcase(
    "theme-engine",
    "Theme engine",
    "Named light and dark palettes, accent inheritance, font pairing, and motion preferences through one provider.",
    `import { ThemeProvider, useTheme } from "@fraym/ui/theme"`,
    ThemeDemo,
  ),
  showcase(
    "config-package",
    "Configuration",
    "A validated, migrated presentation contract shared by public Fraym surfaces.",
    `import { resolveFraymUiConfig } from "@fraym/config"`,
    ConfigDemo,
  ),
  showcase(
    "fixtures-package",
    "Fixtures",
    "Deterministic session scripts for examples, tests, and visual harnesses.",
    `import { DEMO_SCRIPTS } from "@fraym/fixtures"`,
    FixturesDemo,
  ),
  showcase(
    "driver-test-package",
    "Driver test",
    "Reusable conformance and replay tooling for SessionDriver implementations.",
    `import { describeSessionDriverConformance } from "@fraym/driver-test"`,
    DriverTestDemo,
  ),
  showcase(
    "verber-package",
    "Verber",
    "Profile-driven working language that stays independent of any one runtime.",
    `import { resolveVerber } from "@fraym/verber"`,
    VerberDemo,
  ),
  showcase(
    "vibr-package",
    "Vibr",
    "Animated avatars and stream wisps with shared presence physics.",
    `import { Presence } from "@fraym/vibr"`,
    VibrDemo,
  ),
  showcase(
    "aethr-package",
    "Aethr",
    "Canvas-backed ambient presence and cinematic guided scenes.",
    `import { Aethr, CinematicText } from "@fraym/aethr"`,
    AethrDemo,
  ),
] satisfies readonly Entry[];
