import { Button } from "../elements/button";
import { Icon } from "../icons";
import { cn } from "../lib/cn";
import type { ModelCategoryPickerState } from "./model-category-picker-state";
import { ModelPicker } from "./model-picker";

interface ModelCategoryTriggerProps {
	readonly className?: string;
	readonly disabled: boolean;
	readonly pickerId?: string;
	readonly text: string;
	readonly openFromElement: (element: HTMLElement) => void;
}

export function ModelCategoryTrigger({
	className,
	disabled,
	pickerId,
	text,
	openFromElement,
}: ModelCategoryTriggerProps) {
	return (
		<Button
			type="button"
			variant="outline"
			data-slot="model-category-trigger"
			data-picker-id={pickerId}
			className={cn("min-w-[280px] justify-between font-secondary", className)}
			disabled={disabled}
			onClick={event => openFromElement(event.currentTarget)}
		>
			<span className="min-w-0 fr-overflow">{text}</span>
			<Icon name="caretD" size={12} />
		</Button>
	);
}

interface ModelCategoryMenuProps {
	readonly state: ModelCategoryPickerState;
}

export function ModelCategoryMenu({ state }: ModelCategoryMenuProps) {
	if (state.anchorRect === undefined) return null;

	return (
		<ModelPicker
			model={state.pickerSelection}
			onSelect={state.selectModel}
			categories={state.categories}
			efforts={[]}
			allLabel="All available"
			onClose={state.close}
			anchorRect={state.anchorRect}
			place="below"
			style={state.anchorRect ? undefined : { left: 16, top: 16 }}
		/>
	);
}
