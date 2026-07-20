import { useEffect, useRef, useState } from "react";
import { Modal } from "../elements/popover";
import { Icon, type IconName } from "../icons";
import { cn } from "../lib/cn";

export interface PaletteCommand {
	readonly cmd: string;
	readonly desc: string;
	readonly icon: IconName;
}

export interface PaletteCategory {
	readonly name: string;
	readonly items: readonly PaletteCommand[];
}

export interface CommandPaletteProps {
	readonly categories: readonly PaletteCategory[];
	readonly onPick: (cmd: string) => void;
	readonly onClose: () => void;
	readonly className?: string;
}

export function CommandPalette({ categories, onPick, onClose, className }: CommandPaletteProps) {
	const [query, setQuery] = useState("");
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		inputRef.current?.focus();
	}, []);

	const ql = query.trim().toLowerCase();

	return (
		<Modal
			onClose={onClose}
			placement="upper"
			data-slot="command-palette"
			aria-label="Command palette"
			className={cn("w-[540px] max-w-[92vw] rounded-[14px]", className)}
		>
			<div className="flex items-center gap-2.5 border-b border-fr-border-soft px-4 py-3.5">
				<span className="font-secondary text-base text-fr-accent">/</span>
				<input
					ref={inputRef}
					value={query}
					onChange={e => setQuery(e.target.value)}
					placeholder="Run a command…"
					className="flex-1 bg-transparent text-fr-lg text-fr-text outline-none placeholder:text-fr-text-3"
				/>
			</div>
			<div className="max-h-[330px] overflow-y-auto p-1.5">
				{categories.map(cat => {
					const filtered = cat.items.filter(c => c.cmd.includes(ql) || c.desc.toLowerCase().includes(ql));
					if (filtered.length === 0) return null;
					return (
						<div key={cat.name}>
							<div className="px-2.5 pt-[9px] pb-[5px] fr-eyebrow">{cat.name}</div>
							{filtered.map(c => (
								<button
									key={c.cmd}
									type="button"
									className="flex w-full items-center gap-[11px] rounded-lg px-2.5 py-2 text-left hover:bg-fr-surface-2"
									onClick={() => onPick(c.cmd)}
								>
									<span className="flex size-[26px] shrink-0 items-center justify-center rounded-[7px] bg-fr-surface-3 text-fr-text-2">
										<Icon name={c.icon} size={14} strokeWidth={1.8} />
									</span>
									<span className="font-secondary text-fr-base text-fr-text">{c.cmd}</span>
									<span className="ml-auto text-xs text-fr-text-3">{c.desc}</span>
								</button>
							))}
						</div>
					);
				})}
			</div>
		</Modal>
	);
}
