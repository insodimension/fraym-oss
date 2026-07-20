import { useRef, useState } from "react";
import { cn } from "../lib/cn";
import { AvatarGallery } from "./avatar-select-gallery";
import { AvatarSelectTrigger } from "./avatar-select-trigger";

export interface AvatarOption {
	readonly id: string;
	readonly label: string;
	/** Live preview node (e.g. a @fraym/vibr <Presence>). Kept vibr-agnostic. */
	readonly preview: React.ReactNode;
}

export interface AvatarSelectProps {
	readonly options: readonly AvatarOption[];
	readonly value: string;
	readonly onChange: (id: string) => void;
	readonly className?: string;
	/** Modal header copy — defaults to the avatar (vibr) wording. */
	readonly title?: string;
	readonly description?: string;
}

/** The "Vibr" picker: a trigger button plus roomy modal gallery of live previews. */
export function AvatarSelect({ options, value, onChange, className, title, description }: AvatarSelectProps) {
	const [open, setOpen] = useState(false);
	const bodyRef = useRef<HTMLDivElement>(null);
	const current = options.find(option => option.id === value) ?? options[0];

	return (
		<div data-slot="avatar-select" className={cn("flex-none", className)}>
			<AvatarSelectTrigger current={current} open={open} onOpen={() => setOpen(true)} />
			{open && (
				<AvatarGallery
					bodyRef={bodyRef}
					options={options}
					value={value}
					onChange={onChange}
					onClose={() => setOpen(false)}
					title={title}
					description={description}
				/>
			)}
		</div>
	);
}
