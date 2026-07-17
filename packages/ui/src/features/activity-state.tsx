import { classNames } from "../elements/utils";

export type ActivityState = "working" | "needs-you" | "background" | "attached" | "failed" | "ok" | "off" | "idle";

export interface ActivityDotProps { readonly state: ActivityState; readonly size?: number; readonly className?: string }

export function ActivityDot({ state, size = 6, className }: ActivityDotProps) {
  return <span aria-hidden="true" className={classNames("fraym-activity-dot", `fraym-activity-dot--${state}`, className)} data-slot="activity-dot" data-state={state} style={{ height: size, width: size }}>{state === "needs-you" ? <span className="fraym-activity-dot__ping" /> : null}</span>;
}
