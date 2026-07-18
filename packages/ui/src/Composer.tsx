import { ContextRadial } from "./features/composer";

export function ContextUsage({ value, label = "Context used" }: { readonly value: number; readonly label?: string }) {
  return <span title={`${Math.round(value)}% ${label.toLowerCase()}`}><ContextRadial percent={value} /></span>;
}
