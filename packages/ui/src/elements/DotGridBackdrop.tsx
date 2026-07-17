import type { ReactNode } from "react";

import { classNames } from "./utils";

export interface DotGridBackdropProps { className?: string; children?: ReactNode; glow?: boolean }

export function DotGridBackdrop({ className, children, glow = true }: DotGridBackdropProps) {
  return <div className={classNames("fraym-dot-grid", className)} data-slot="dot-grid-backdrop"><span aria-hidden="true" className="fraym-dot-grid__pattern" data-slot="dot-grid-pattern" />{glow ? <span aria-hidden="true" className="fraym-dot-grid__glow" data-slot="dot-grid-glow" /> : null}{children}</div>;
}
