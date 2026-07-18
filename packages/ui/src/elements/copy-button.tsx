"use client";

import { useState } from "react";
import { Icon } from "../icons";
import { cn } from "../lib/cn";
import { IconButton } from "./icon-button";

export interface CopyButtonProps {
	/** Text written to the clipboard on click. */
	readonly value: string;
	/** Accessible label / tooltip shown before the copied confirmation. */
	readonly label?: string;
	readonly className?: string;
}

/**
 * Copy-to-clipboard control with a brief "copied" check. The single affordance
 * behind every code surface — prose fenced blocks and the standalone CodeBlock —
 * so the copy behavior and its 2s confirmation can never drift between them.
 */
export function CopyButton({ value, label = "Copy", className }: CopyButtonProps) {
	const [copied, setCopied] = useState(false);
	const onCopy = () => {
		navigator.clipboard?.writeText(value)?.then(() => {
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		});
	};
	return (
		<IconButton
			variant="surface"
			aria-label={copied ? "Copied" : label}
			title={copied ? "Copied" : label}
			onClick={onCopy}
			className={cn("size-7", className)}
		>
			<Icon name={copied ? "check" : "copy"} size={14} />
		</IconButton>
	);
}
