import { compatibleWispPresets, WispPreview, wispPresetForAvatar } from "@fraym/vibr";
import { applyGate, useDeploymentGates } from "../deployment-gates";
import { AvatarSelect } from "./avatar-select";

/**
 * StreamWispSelect — the wisp twin of the Vibr (avatar) picker: a trigger
 * plus a modal gallery of LIVE demos (each tile runs the real physics + preset
 * against a scripted caret loop via vibr's <WispPreview>).
 *
 * The option list derives from the vibr wisp registry, filtered by the
 * chosen avatar's compatibility (lore kinship: the wisp is the avatar's
 * in-motion embodiment). "Auto" is always first and previews whatever the
 * avatar's kin resolves to — so the gallery updates by itself when new
 * presets register or the avatar changes. Nothing here is preset-specific.
 */
export interface StreamWispSelectProps {
	/** The chosen avatar id — constrains which wisp forms are offered. */
	readonly avatar: string;
	/** Current `streamWispPreset` setting value ("auto" or a preset id). */
	readonly value: string;
	readonly onChange: (preset: string) => void;
	readonly className?: string;
}

export function StreamWispSelect({ avatar, value, onChange, className }: StreamWispSelectProps) {
	const kin = wispPresetForAvatar(avatar);
	const options = [
		{
			id: "auto",
			label: "Auto",
			preview: <WispPreview preset={kin} />,
		},
		...compatibleWispPresets(avatar).map(def => ({
			id: def.id,
			label: def.label,
			preview: <WispPreview preset={def.id} />,
		})),
	];
	const { enabledWisps } = useDeploymentGates();
	const gatedOptions = applyGate(options, enabledWisps);
	return (
		<AvatarSelect
			value={value}
			onChange={onChange}
			options={gatedOptions}
			className={className}
			title="Choose a wisp"
			description="The in-motion embodiment that rides the streaming caret — only forms compatible with your Vibr."
		/>
	);
}

export { StreamWispSelect as StreamCursorSelect };
export type StreamCursorSelectProps = StreamWispSelectProps;
