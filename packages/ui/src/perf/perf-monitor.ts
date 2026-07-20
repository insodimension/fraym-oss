class PerfMonitor {
	private hudEnabled = false;

	toggleHud(): void {
		this.hudEnabled = !this.hudEnabled;
		if (typeof document === "undefined") return;
		document.documentElement.dataset.perfHud = this.hudEnabled ? "true" : undefined;
		document.dispatchEvent(new CustomEvent("fraym:perf-hud", { detail: { enabled: this.hudEnabled } }));
	}
}

export const perfMonitor = new PerfMonitor();
