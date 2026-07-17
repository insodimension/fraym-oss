import type { ReactNode } from "react";
import { classNames } from "../elements/utils";
import { dotToneClass, type ComposerControlTone } from "./surface-kit";

export function StatusDot({ tone, pulse, size = 7, className }: { readonly tone?: ComposerControlTone | "mute"; readonly pulse?: boolean; readonly size?: number; readonly className?: string }) {
  return <span aria-hidden="true" className={classNames("fraym-status-dot", dotToneClass(tone), pulse && "is-pulsing", className)} data-slot="status-dot" style={{ height: size, width: size }} />;
}

export function Meter({ value, total, tone = "accent", className, thickness = 6 }: { readonly value: number; readonly total: number; readonly tone?: ComposerControlTone | "mute"; readonly className?: string; readonly thickness?: number }) {
  const percent = total > 0 ? Math.min(100, Math.max(0, Math.round((value / total) * 100))) : 0;
  return <div aria-valuemax={total} aria-valuenow={value} className={classNames("fraym-meter", className)} data-slot="meter" role="progressbar" style={{ height: thickness }}><span className={dotToneClass(tone)} style={{ width: `${percent}%` }} /></div>;
}

export function ModeEyebrow({ children, trailing, className }: { readonly children: ReactNode; readonly trailing?: ReactNode; readonly className?: string }) {
  return <div className={classNames("fraym-mode-eyebrow", className)} data-slot="mode-eyebrow"><span>{children}</span><i aria-hidden="true" />{trailing ? <small>{trailing}</small> : null}</div>;
}
