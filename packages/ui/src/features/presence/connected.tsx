import { type AvatarId, Presence } from "@fraym/vibr";
import { useSessionOptional, useVibr } from "../../hooks/use-session";

export interface ConnectedPresenceProps
	extends Omit<React.ComponentProps<typeof Presence>, "avatar" | "state" | "mode" | "energy"> {
	readonly avatar?: AvatarId;
}

export function ConnectedPresence({ avatar = "blob", ...props }: ConnectedPresenceProps) {
	const vibr = useVibr();
	return <Presence avatar={avatar} state={vibr.state} mode={vibr.mode} energy={vibr.energy} {...props} />;
}

export interface OptionalConnectedPresenceProps extends ConnectedPresenceProps {
	readonly fallbackState?: React.ComponentProps<typeof Presence>["state"];
	readonly fallbackMode?: React.ComponentProps<typeof Presence>["mode"];
	readonly fallbackEnergy?: number;
}

export function OptionalConnectedPresence({
	avatar = "blob",
	fallbackState = "idle",
	fallbackMode = "",
	fallbackEnergy = 0,
	...props
}: OptionalConnectedPresenceProps) {
	const session = useSessionOptional();
	return (
		<Presence
			avatar={avatar}
			state={session?.vibrState ?? fallbackState}
			mode={session?.vibrMode ?? fallbackMode}
			energy={session?.energy ?? fallbackEnergy}
			{...props}
		/>
	);
}
