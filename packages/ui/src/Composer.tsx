import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type DragEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import { Button } from "./elements/Button";
import { IconButton } from "./elements/IconButton";
import { Textarea } from "./elements/Textarea";
import { classNames } from "./elements/utils";
import {
  filterSlashCommands,
  getComposerKeyAction,
  type SlashCommand,
} from "./composer-state";

export interface ComposerAttachment {
  id: string;
  name: string;
  type: string;
  url: string;
  file: File;
}

export interface ComposerSubmission {
  value: string;
  attachments: readonly ComposerAttachment[];
}

export interface ComposerProps {
  className?: string;
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  disabled?: boolean;
  streaming?: boolean;
  commands?: readonly SlashCommand[];
  leftSlot?: ReactNode;
  rightSlot?: ReactNode;
  onValueChange?: (value: string) => void;
  onSubmit?: (submission: ComposerSubmission) => void;
  onStop?: () => void;
  onCommand?: (command: SlashCommand) => void;
}

const defaultCommands: readonly SlashCommand[] = [
  { name: "clear", label: "Clear session", description: "Reset the current transcript", group: "Session", icon: "×" },
  { name: "replay", label: "Replay fixture", description: "Run this recorded session again", group: "Session", icon: "↻" },
  { name: "theme", label: "Change theme", description: "Switch the active appearance", group: "Appearance", icon: "◐" },
];

function imageFiles(files: FileList | readonly File[]): readonly File[] {
  return Array.from(files).filter((file) => file.type.startsWith("image/"));
}

export function ContextUsage({ value, label = "Context used" }: { value: number; label?: string }) {
  const percent = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <span aria-label={`${label}: ${percent}%`} className="fraym-context-usage" role="img" title={`${percent}% ${label.toLowerCase()}`}>
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <circle className="fraym-context-usage__track" cx="12" cy="12" r="9" pathLength="100" />
        <circle className="fraym-context-usage__value" cx="12" cy="12" r="9" pathLength="100" strokeDasharray={`${percent} 100`} />
      </svg>
      <span>{percent}</span>
    </span>
  );
}

export function Composer({
  className,
  commands = defaultCommands,
  defaultValue = "",
  disabled = false,
  leftSlot,
  onCommand,
  onStop,
  onSubmit,
  onValueChange,
  placeholder = "Ask a follow-up…",
  rightSlot,
  streaming = false,
  value,
}: ComposerProps) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const [attachments, setAttachments] = useState<readonly ComposerAttachment[]>([]);
  const [activeCommand, setActiveCommand] = useState(0);
  const [menuDismissed, setMenuDismissed] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachmentRef = useRef(attachments);
  const currentValue = value ?? internalValue;
  const commandMenuId = useId();
  const filteredCommands = useMemo(
    () => filterSlashCommands(commands, currentValue),
    [commands, currentValue],
  );
  const menuOpen = !menuDismissed && filteredCommands.length > 0;

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [currentValue]);

  useEffect(() => {
    attachmentRef.current = attachments;
  }, [attachments]);

  useEffect(() => () => {
    for (const attachment of attachmentRef.current) URL.revokeObjectURL(attachment.url);
  }, []);

  useEffect(() => setActiveCommand(0), [currentValue]);

  const updateValue = (next: string) => {
    if (value === undefined) setInternalValue(next);
    setMenuDismissed(false);
    onValueChange?.(next);
  };

  const addFiles = (files: FileList | readonly File[]) => {
    const images = imageFiles(files);
    if (images.length === 0) return;
    setAttachments((current) => [
      ...current,
      ...images.map((file) => ({
        id: crypto.randomUUID(),
        name: file.name || "Pasted image",
        type: file.type,
        url: URL.createObjectURL(file),
        file,
      })),
    ]);
  };

  const removeAttachment = (id: string) => {
    setAttachments((current) => {
      const target = current.find((attachment) => attachment.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return current.filter((attachment) => attachment.id !== id);
    });
  };

  const selectCommand = (command: SlashCommand) => {
    updateValue(`/${command.name} `);
    setMenuDismissed(true);
    onCommand?.(command);
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const submit = () => {
    const trimmed = currentValue.trim();
    if (disabled || streaming || (trimmed.length === 0 && attachments.length === 0)) return;
    onSubmit?.({ value: trimmed, attachments });
    if (value === undefined) setInternalValue("");
    onValueChange?.("");
    setAttachments([]);
    for (const attachment of attachments) URL.revokeObjectURL(attachment.url);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    const action = getComposerKeyAction({ key: event.key, shiftKey: event.shiftKey, menuOpen });
    if (action === "none" || action === "newline") return;
    event.preventDefault();

    if (action === "submit") submit();
    if (action === "menu-close") setMenuDismissed(true);
    if (action === "menu-next") setActiveCommand((current) => (current + 1) % filteredCommands.length);
    if (action === "menu-previous") setActiveCommand((current) => (current - 1 + filteredCommands.length) % filteredCommands.length);
    if (action === "menu-select") {
      const command = filteredCommands[activeCommand];
      if (command) selectCommand(command);
    }
  };

  const onPaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const images = imageFiles(event.clipboardData.files);
    if (images.length === 0) return;
    event.preventDefault();
    addFiles(images);
  };

  const onDrop = (event: DragEvent<HTMLFormElement>) => {
    const images = imageFiles(event.dataTransfer.files);
    if (images.length === 0) return;
    event.preventDefault();
    addFiles(images);
  };

  const onChange = (event: ChangeEvent<HTMLTextAreaElement>) => updateValue(event.currentTarget.value);
  const canSubmit = currentValue.trim().length > 0 || attachments.length > 0;
  const groups = [...new Set(filteredCommands.map((command) => command.group))];

  return (
    <form
      className={classNames("fraym-composer", className)}
      onDragOver={(event) => event.preventDefault()}
      onDrop={onDrop}
      onSubmit={(event) => { event.preventDefault(); submit(); }}
    >
      {menuOpen ? (
        <div aria-label="Slash commands" className="fraym-composer__command-menu" id={commandMenuId} role="listbox">
          {groups.map((group) => (
            <section className="fraym-composer__command-group" key={group}>
              <span className="fraym-composer__command-group-label">{group}</span>
              {filteredCommands.map((command, index) => command.group === group ? (
                <button
                  aria-selected={index === activeCommand}
                  className="fraym-composer__command"
                  id={`${commandMenuId}-${command.name}`}
                  key={command.name}
                  onClick={() => selectCommand(command)}
                  role="option"
                  type="button"
                >
                  <span aria-hidden="true" className="fraym-composer__command-icon">{command.icon ?? "/"}</span>
                  <span><strong>/{command.name}</strong><small>{command.description}</small></span>
                </button>
              ) : null)}
            </section>
          ))}
        </div>
      ) : null}

      {attachments.length > 0 ? (
        <div aria-label="Image attachments" className="fraym-composer__attachments">
          {attachments.map((attachment) => (
            <span className="fraym-composer__attachment" key={attachment.id}>
              <img alt="" src={attachment.url} />
              <span>{attachment.name}</span>
              <button aria-label={`Remove ${attachment.name}`} onClick={() => removeAttachment(attachment.id)} type="button">×</button>
            </span>
          ))}
        </div>
      ) : null}

      <div className="fraym-composer__field">
        <Textarea
          aria-activedescendant={menuOpen ? `${commandMenuId}-${filteredCommands[activeCommand]?.name ?? ""}` : undefined}
          aria-autocomplete="list"
          aria-controls={menuOpen ? commandMenuId : undefined}
          aria-expanded={menuOpen}
          aria-label="Agent message"
          disabled={disabled}
          onChange={onChange}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          placeholder={placeholder}
          ref={textareaRef}
          rows={1}
          value={currentValue}
        />
      </div>

      <div className="fraym-composer__actions">
        <div className="fraym-composer__actions-left">
          <input
            accept="image/*"
            hidden
            multiple
            onChange={(event) => { if (event.currentTarget.files) addFiles(event.currentTarget.files); event.currentTarget.value = ""; }}
            ref={fileInputRef}
            type="file"
          />
          <IconButton label="Attach images" onClick={() => fileInputRef.current?.click()} size="sm" variant="ghost">+</IconButton>
          {leftSlot}
        </div>
        <div className="fraym-composer__actions-right">
          {rightSlot}
          {streaming ? (
            <Button aria-label="Stop agent" onClick={onStop} size="sm" variant="danger">Stop</Button>
          ) : (
            <Button disabled={disabled || !canSubmit} size="sm" type="submit" variant="primary">Send</Button>
          )}
        </div>
      </div>
    </form>
  );
}
