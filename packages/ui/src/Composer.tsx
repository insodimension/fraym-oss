import { ContextRadial } from "./features/composer/composer-core";
export { Composer, ComposerChip, ContextRadial, type ComposerProps, type ComposerSubmission, type ComposerImageAttachment as ComposerAttachment } from "./features/composer/composer-core";
export function ContextUsage({ value, label = "Context used" }: { readonly value: number; readonly label?: string }) { return <span title={`${Math.round(value)}% ${label.toLowerCase()}`}><ContextRadial percent={value} /></span>; }
