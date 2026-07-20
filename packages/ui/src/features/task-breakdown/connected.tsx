import { useSession } from "../../hooks/use-session";
import type { FraymSurfaceConfig } from "../surface-kit";
import { TaskBreakdown } from "./task-breakdown";

export interface ConnectedTaskBreakdownProps {
	readonly settings?: FraymSurfaceConfig;
	readonly className?: string;
}

export function ConnectedTaskBreakdown({ settings, className }: ConnectedTaskBreakdownProps) {
	const session = useSession();
	return <TaskBreakdown phases={session.tasks} settings={settings} className={className} />;
}
