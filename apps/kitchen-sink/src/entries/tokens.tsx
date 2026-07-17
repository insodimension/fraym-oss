import { Badge, Code, tokens, type FraymColorToken } from "@fraym/ui";

import type { Entry } from "../entry";

const colorEntries: ReadonlyArray<[FraymColorToken, string]> = [
  ["bg", tokens.color.bg],
  ["surface", tokens.color.surface],
  ["border", tokens.color.border],
  ["text", tokens.color.text],
  ["muted", tokens.color.muted],
  ["accent", tokens.color.accent],
  ["success", tokens.color.success],
  ["warning", tokens.color.warning],
  ["danger", tokens.color.danger],
];

const typeEntries = [
  ["xs", tokens.type.xs],
  ["sm", tokens.type.sm],
  ["base", tokens.type.base],
  ["lg", tokens.type.lg],
  ["xl", tokens.type.xl],
] as const;

const spaceEntries = [
  ["1", tokens.space[1]],
  ["2", tokens.space[2]],
  ["3", tokens.space[3]],
  ["4", tokens.space[4]],
  ["5", tokens.space[5]],
  ["6", tokens.space[6]],
  ["8", tokens.space[8]],
  ["10", tokens.space[10]],
] as const;

function TokensDemo() {
  return (
    <div className="sink-token-demo">
      <section aria-labelledby="color-tokens-heading">
        <div className="sink-demo-heading">
          <h3 id="color-tokens-heading">Color</h3>
          <Badge tone="accent">9 semantic roles</Badge>
        </div>
        <div className="sink-palette">
          {colorEntries.map(([name, value]) => (
            <div className="sink-swatch" key={name}>
              <div className="sink-swatch__color" style={{ background: value }} />
              <strong>{name}</strong>
              <Code>{`--fraym-color-${name}`}</Code>
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
  gap: tokens.space[4],
  borderRadius: tokens.radius.md,
};`,
    examples: [
      {
        title: "Typed access",
        description: "Use the TypeScript export when a component needs token values inline.",
        code: `const panelStyle = {
  background: tokens.color.surface,
  padding: tokens.space[6],
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
      { name: "type", type: "FraymTypeTokens", defaultValue: "system", description: "Sans family and a compact interface type scale." },
      { name: "space", type: "FraymSpaceTokens", defaultValue: "4px base", description: "Shared spacing rhythm for layout and components." },
    ],
  },
] satisfies readonly Entry[];
