import { ContextRadial } from "./features/composer/composer-core";
import {
  Composer as CoreComposer,
  type CommandComposerProps,
  type ComposerProps as CoreComposerProps,
} from "./features/composer/composer-core";

export type ComposerProps = CoreComposerProps | CommandComposerProps;
export type { ComposerSubmission, ComposerImageAttachment as ComposerAttachment } from "./features/composer/composer-core";
export { ComposerChip, ContextRadial } from "./features/composer/composer-core";

export function Composer(props: CommandComposerProps): React.JSX.Element;
export function Composer(props: CoreComposerProps): React.JSX.Element;
export function Composer(props: ComposerProps) {
  if ("slashCommands" in props) {
    const { slashCommands, argumentCompletionSource: _argumentCompletionSource, onSubmit, ...rest } = props;
    const commands = slashCommands.map(command => ({
      ...command,
      name: command.name ?? command.value?.replace(/^\/+/, "") ?? command.label.replace(/^\/+/, ""),
      ...(command.value !== undefined || command.name !== undefined ? { value: command.value ?? command.name! } : {}),
      description: command.description ?? "",
      group: command.group ?? "Commands",
    }));
    return <CoreComposer {...rest} commands={commands} onSubmit={submission => onSubmit(submission.value, submission.attachments)} />;
  }
  return <CoreComposer {...props} />;
}

export function ContextUsage({ value, label = "Context used" }: { readonly value: number; readonly label?: string }) {
  return <span title={`${Math.round(value)}% ${label.toLowerCase()}`}><ContextRadial percent={value} /></span>;
}
