const MINUTE_SECONDS = 60;
const HOUR_MINUTES = 60;
const DAY_MINUTES = 24 * HOUR_MINUTES;

export function formatResetCountdown(resetsAt: number | undefined, now?: number): string | null {
	if (!resetsAt) return null;
	const remainingMs = resetsAt - (now ?? Date.now());
	if (remainingMs <= 0) return null;
	const seconds = Math.ceil(remainingMs / 1000);
	return `resets in ${formatCountdownDuration(seconds)}`;
}

function formatCountdownDuration(seconds: number): string {
	if (seconds < MINUTE_SECONDS) return `${seconds}s`;
	const minutes = Math.ceil(seconds / MINUTE_SECONDS);
	if (minutes < HOUR_MINUTES) return `${minutes}m`;
	if (minutes < DAY_MINUTES) return formatHourMinuteDuration(minutes);
	return formatDayHourDuration(minutes);
}

function formatHourMinuteDuration(minutes: number): string {
	const hours = Math.floor(minutes / HOUR_MINUTES);
	const remainderMinutes = minutes % HOUR_MINUTES;
	return remainderMinutes > 0 ? `${hours}h ${remainderMinutes}m` : `${hours}h`;
}

function formatDayHourDuration(minutes: number): string {
	const days = Math.floor(minutes / DAY_MINUTES);
	const remainderHours = Math.floor((minutes % DAY_MINUTES) / HOUR_MINUTES);
	return remainderHours > 0 ? `${days}d ${remainderHours}h` : `${days}d`;
}
