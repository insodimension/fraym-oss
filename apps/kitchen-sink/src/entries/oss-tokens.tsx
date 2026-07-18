import { Badge, Code, tokens, type FraymColorToken } from "@fraym/ui";

import type { Entry } from "../entry";

const colorEntries: ReadonlyArray<[FraymColorToken, string, string]> = [
  ["bg", tokens.color.bg, "--fraym-color-bg"],
  ["rail", tokens.color.rail, "--fraym-color-rail"],
  ["surface", tokens.color.surface, "--fraym-color-surface"],
  ["surface2", tokens.color.surface2, "--fraym-color-surface-2"],
  ["surface3", tokens.color.surface3, "--fraym-color-surface-3"],
  ["border", tokens.color.border, "--fraym-color-border"],
  ["borderSoft", tokens.color.borderSoft, "--fraym-color-border-soft"],
  ["text", tokens.color.text, "--fraym-color-text"],
  ["text2", tokens.color.text2, "--fraym-color-text-2"],
  ["text3", tokens.color.text3, "--fraym-color-text-3"],
  ["accent", tokens.color.accent, "--fraym-color-accent"],
  ["success", tokens.color.success, "--fraym-color-success"],
  ["warning", tokens.color.warning, "--fraym-color-warning"],
  ["danger", tokens.color.danger, "--fraym-color-danger"],
  ["info", tokens.color.info, "--fraym-color-info"],
  ["iris", tokens.color.iris, "--fraym-color-iris"],
];

const typeEntries = [
  ["display", tokens.type.display],
  ["heading-xl", tokens.type.headingXl],
  ["heading-lg", tokens.type.headingLg],
  ["title", tokens.type.title],
  ["body-md", tokens.type.bodyMd],
  ["body-sm", tokens.type.bodySm],
  ["label", tokens.type.label],
  ["code", tokens.type.code],
  ["caption", tokens.type.caption],
  ["eyebrow", tokens.type.eyebrow],
] as const;

const spaceEntries = [
  ["xs", tokens.space.xs],
  ["sm", tokens.space.sm],
  ["md", tokens.space.md],
  ["lg", tokens.space.lg],
  ["xl", tokens.space.xl],
] as const;

const radiusEntries = [
  ["sm", tokens.radius.sm],
  ["md", tokens.radius.md],
  ["lg", tokens.radius.lg],
  ["xl", tokens.radius.xl],
  ["full", tokens.radius.full],
] as const;

function TokensDemo() {
  return (
    <div className="sink-token-demo">
      <section aria-labelledby="color-tokens-heading">
        <div className="sink-demo-heading">
          <h3 id="color-tokens-heading">Color</h3>
          <Badge tone="accent">16 semantic roles</Badge>
        </div>
        <div className="sink-palette">
          {colorEntries.map(([name, value, variable]) => (
            <div className="sink-swatch" key={name}>
              <div className="sink-swatch__color" style={{ background: value }} />
              <strong>{name}</strong>
              <Code>{variable}</Code>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="type-tokens-heading">
        <h3 id="type-tokens-heading">Type scale</h3>
        <div className="sink-type-scale">
          {typeEntries.map(([name, value]) => (
            <div className="sink-type-row" key={name}>
              <Code>{name}</Code>
              <span style={{ fontSize: value }}>Agent interfaces need quiet hierarchy.</span>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="space-tokens-heading">
        <h3 id="space-tokens-heading">Spacing scale</h3>
        <div className="sink-space-scale">
          {spaceEntries.map(([name, value]) => (
            <div className="sink-space-row" key={name}>
              <Code>{name}</Code>
              <span className="sink-space-bar" style={{ width: value }} />
              <span>{value}</span>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="radius-tokens-heading">
        <h3 id="radius-tokens-heading">Radius family</h3>
        <div className="sink-radius-scale">
          {radiusEntries.map(([name, value]) => (
            <div className="sink-radius-row" key={name} style={{ borderRadius: value }}>
              <Code>{name}</Code>
              <span>{value}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export const tokenEntries = [
  {
    id: "tokens",
    title: "Design tokens",
    group: "tokens",
    tier: "Foundation",
    description:
      "Semantic color, type, spacing, radius, and motion values shared by every Fraym surface.",
    importCode: `import { tokens } from "@fraym/ui"`,
    Demo: TokensDemo,
    knobs: [],
    code: () => `import { tokens } from "@fraym/ui";

const style = {
  color: tokens.color.text,
  gap: tokens.space.lg,
  borderRadius: tokens.radius.md,
};`,
    examples: [
      {
        title: "Typed access",
        description: "Use the TypeScript export when a component needs token values inline.",
        code: `const panelStyle = {
  background: tokens.color.surface,
  padding: tokens.space.xl,
};`,
      },
      {
        title: "CSS variables",
        description: "Use the same semantic contract in stylesheets.",
        code: `.panel {
  color: var(--fraym-color-text);
  background: var(--fraym-color-surface);
}`,
      },
    ],
    props: [
      { name: "color", type: "FraymColorTokens", defaultValue: "dark set", description: "Semantic surface, text, accent, and status colors." },
      { name: "type", type: "FraymTypeTokens", defaultValue: "IBM Plex", description: "Sans UI levels and Mono machine-data levels." },
      { name: "space", type: "FraymSpaceTokens", defaultValue: "3 / 8 / 12 / 16 / 26", description: "Shared cockpit spacing rhythm." },
    ],
  },
] satisfies readonly Entry[];

