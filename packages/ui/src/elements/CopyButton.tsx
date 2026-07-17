import { useEffect, useRef, useState } from "react";

import { IconButton } from "./IconButton";
import { classNames } from "./utils";

export interface CopyButtonProps { value: string; label?: string; className?: string }

export function CopyButton({ value, label = "Copy", className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const timeout = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timeout.current), []);
  const copy = async () => { try { await navigator.clipboard.writeText(value); setCopied(true); window.clearTimeout(timeout.current); timeout.current = window.setTimeout(() => setCopied(false), 2000); } catch { setCopied(false); } };
  return <IconButton className={classNames("fraym-copy-button", className)} label={copied ? "Copied" : label} size="icon" title={copied ? "Copied" : label} variant="secondary" onClick={() => void copy()}><span aria-hidden="true">{copied ? "✓" : "⧉"}</span></IconButton>;
}
