import { useEffect, useState, type ReactNode } from "react";

import { classNames } from "./utils";

export interface CollapseRegionProps { open: boolean; children: ReactNode; durationMs?: number; className?: string; contentClassName?: string }

export function CollapseRegion({ open, children, durationMs = 200, className, contentClassName }: CollapseRegionProps) {
  const [mounted, setMounted] = useState(open);
  if (open && !mounted) setMounted(true);
  useEffect(() => { if (open || !mounted) return; const timer = window.setTimeout(() => setMounted(false), durationMs + 50); return () => window.clearTimeout(timer); }, [durationMs, mounted, open]);
  return <div aria-hidden={!open} className={classNames("fraym-collapse", open && "is-open", className)} data-slot="collapse-region" style={{ transitionDuration: `${durationMs}ms` }}><div className={classNames("fraym-collapse__content", contentClassName)}>{mounted ? children : null}</div></div>;
}
