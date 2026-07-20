import { Modal } from "../elements/popover";
import { Icon } from "../icons";
import { cn } from "../lib/cn";
import { LazyPreview } from "./avatar-lazy-preview";
import type { AvatarOption } from "./avatar-select";

interface AvatarGalleryProps {
	readonly bodyRef: React.RefObject<HTMLDivElement | null>;
	readonly options: readonly AvatarOption[];
	readonly value: string;
	readonly onChange: (id: string) => void;
	readonly onClose: () => void;
	/** Modal header copy — defaults to the avatar (vibr) wording. */
	readonly title?: string;
	readonly description?: string;
}

export function AvatarGallery({
	bodyRef,
	options,
	value,
	onChange,
	onClose,
	title = "Choose a vibr",
	description = "The presence shown while Fraym works, and the shape it settles on.",
}: AvatarGalleryProps) {
	return (
		<Modal
			onClose={onClose}
			data-slot="avatar-gallery"
			aria-label={title}
			className="flex max-h-[82vh] w-[640px] max-w-[92vw] flex-col"
		>
			<AvatarGalleryHeader onClose={onClose} title={title} description={description} />
			<AvatarGalleryGrid bodyRef={bodyRef} options={options} value={value} onChange={onChange} onClose={onClose} />
		</Modal>
	);
}

function AvatarGalleryHeader({
	onClose,
	title,
	description,
}: {
	readonly onClose: () => void;
	readonly title: string;
	readonly description: string;
}) {
	return (
		<div className="flex items-start gap-3 border-b border-fr-border-soft px-5 py-4">
			<div className="min-w-0 flex-1">
				<div className="text-fr-lg font-semibold text-fr-text">{title}</div>
				<div className="mt-0.5 text-fr-sm text-fr-text-2">{description}</div>
			</div>
			<button
				type="button"
				aria-label="Close"
				className="flex size-[30px] shrink-0 items-center justify-center rounded-[8px] text-fr-text-3 transition-colors duration-[100ms] hover:bg-fr-surface-2 hover:text-fr-text"
				onClick={onClose}
			>
				<Icon name="x" size={15} strokeWidth={2} />
			</button>
		</div>
	);
}

interface AvatarGalleryGridProps extends AvatarGalleryProps {}

function AvatarGalleryGrid({ bodyRef, options, value, onChange, onClose }: AvatarGalleryGridProps) {
	return (
		<div ref={bodyRef} className="min-h-0 flex-1 overflow-y-auto p-5">
			<div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-3">
				{options.map(option => (
					<AvatarTile
						key={option.id}
						option={option}
						selected={value === option.id}
						bodyRef={bodyRef}
						onPick={() => {
							onChange(option.id);
							onClose();
						}}
					/>
				))}
			</div>
		</div>
	);
}

interface AvatarTileProps {
	readonly option: AvatarOption;
	readonly selected: boolean;
	readonly bodyRef: React.RefObject<HTMLDivElement | null>;
	readonly onPick: () => void;
}

function AvatarTile({ option, selected, bodyRef, onPick }: AvatarTileProps) {
	return (
		<button
			type="button"
			data-selected={selectedDataValue(selected)}
			className={avatarTileClassName(selected)}
			onClick={onPick}
		>
			<LazyPreview root={bodyRef}>{option.preview}</LazyPreview>
			<span className={avatarTileLabelClassName(selected)}>{option.label}</span>
			<AvatarSelectedBadgeSlot selected={selected} />
		</button>
	);
}

function selectedDataValue(selected: boolean): true | undefined {
	return selected ? true : undefined;
}

function avatarTileClassName(selected: boolean): string {
	return cn(
		"relative flex flex-col items-center gap-2.5 rounded-[14px] border p-3 transition-colors duration-[120ms]",
		selected ? "border-fr-accent" : "border-fr-border-soft hover:border-fr-text-3",
	);
}

function avatarTileLabelClassName(selected: boolean): string {
	return cn("text-fr-sm", selected ? "text-fr-text" : "text-fr-text-2");
}

function AvatarSelectedBadgeSlot({ selected }: { readonly selected: boolean }) {
	return selected ? <AvatarSelectedBadge /> : null;
}

function AvatarSelectedBadge() {
	return (
		<span className="absolute right-2 top-2 flex size-[18px] items-center justify-center rounded-full bg-fr-accent text-fr-accent-ink">
			<Icon name="check" size={11} strokeWidth={2.6} />
		</span>
	);
}
