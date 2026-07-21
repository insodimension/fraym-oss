import type { ComponentType } from "react";

const entryGroups = ["tokens", "elements", "tools", "features"] as const;
export type EntryGroup = (typeof entryGroups)[number];

const elementSubgroups = ["actions", "inputs", "feedback", "layout", "content"] as const;
export type ElementSubgroup = (typeof elementSubgroups)[number];

export type KnobValue = string | number | boolean;
export type KnobValues = Readonly<Record<string, KnobValue>>;

interface KnobBase {
  prop: string;
  label: string;
  description?: string;
}

export interface PickKnob extends KnobBase {
  kind: "pick";
  options: readonly string[];
  defaultValue: string;
}

export interface TextKnob extends KnobBase {
  kind: "text";
  defaultValue: string;
}

export interface ToggleKnob extends KnobBase {
  kind: "toggle";
  defaultValue: boolean;
}

export interface NumberKnob extends KnobBase {
  kind: "number";
  defaultValue: number;
  min?: number;
  max?: number;
  step?: number;
}

export type Knob = PickKnob | TextKnob | ToggleKnob | NumberKnob;

export interface PropDoc {
  name: string;
  type: string;
  defaultValue: string;
  description: string;
}

export interface CodeExample {
  title: string;
  description: string;
  code: string;
}

export interface DemoProps {
  values: KnobValues;
}

export interface Entry {
  id: string;
  title: string;
  group: EntryGroup;
  subgroup?: ElementSubgroup;
  tier: string;
  description: string;
  importCode: string;
  Demo: ComponentType<DemoProps>;
  knobs: readonly Knob[];
  code: (values: KnobValues) => string;
  examples: readonly CodeExample[];
  props: readonly PropDoc[];
}

export function elementEntry(composedDescription: (title: string) => string) {
  return (id: string, title: string, subgroup: ElementSubgroup, description: string, Demo: ComponentType<DemoProps>, code: string, names = title): Entry => ({
    id,
    title,
    group: "elements",
    subgroup,
    tier: "Element",
    description,
    importCode: `import { ${names} } from "@fraym-ai/ui"`,
    Demo,
    knobs: [],
    code: () => code,
    examples: [
      { title: "Basic", description: `A focused ${title} usage.`, code },
      { title: "Composed", description: composedDescription(title), code: `<Card><CardContent>${code}</CardContent></Card>` },
    ],
    props: [{ name: "className", type: "string", defaultValue: "undefined", description: "Optional styling hook for composition." }],
  });
}

export function initialKnobValues(knobs: readonly Knob[]): Record<string, KnobValue> {
  return Object.fromEntries(knobs.map((knob) => [knob.prop, knob.defaultValue]));
}

export function stringValue(values: KnobValues, prop: string, fallback: string): string {
  const value = values[prop];
  return typeof value === "string" ? value : fallback;
}

export function booleanValue(values: KnobValues, prop: string, fallback = false): boolean {
  const value = values[prop];
  return typeof value === "boolean" ? value : fallback;
}

export function numberValue(values: KnobValues, prop: string, fallback: number): number {
  const value = values[prop];
  return typeof value === "number" ? value : fallback;
}
