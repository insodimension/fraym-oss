import { cn } from "../lib/cn";
import type { AvatarOption } from "./avatar-select";

interface AvatarSelectTriggerProps {
	readonly current: AvatarOption | undefined;
	readonly open: boolean;
	readonly onOpen: () => void;
}

export function AvatarSelectTrigger({ current, open, onOpen }: AvatarSelectTriggerProps) {
	return (
		<button type="button" data-state={triggerState(open)} className={triggerClassName(open)} onClick={onOpen}>
			<span className="flex size-[30px] shrink-0 items-center justify-center">{current?.preview}</span>
			<span className="flex-1 text-left text-fr-base text-fr-text">{current?.label}</span>
		</button>
	);
}

function triggerState(open: boolean): "open" | "closed" {
	return open ? "open" : "closed";
}

function triggerClassName(open: boolean): string {
	return cn(
		"flex min-w-[170px] items-center gap-[9px] rounded-[9px] border bg-fr-surface px-2.5 py-[7px] text-fr-text transition-[border-color] duration-[120ms]",
		open ? "border-fr-accent-line" : "border-fr-border hover:border-fr-text-3",
	);
}
