import { memo, type ReactNode } from "react";

import { classNames } from "./utils";

const digits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
export interface RollingNumberProps { value: number; className?: string; durationMs?: number; animate?: boolean; decimals?: number; prefix?: ReactNode; suffix?: ReactNode }

const RollingDigit = memo(function RollingDigit({ digit, durationMs }: { digit: number; durationMs: number }) {
  return <span aria-hidden="true" className="fraym-rolling-number__window"><span className="fraym-rolling-number__reel" style={{ transform: `translateY(-${digit}em)`, transitionDuration: `${durationMs}ms` }}>{digits.map((item) => <span key={item}>{item}</span>)}</span></span>;
});

export function RollingNumber({ value, className, durationMs = 280, animate = true, decimals = 0, prefix, suffix }: RollingNumberProps) {
  const formatted = (Number.isFinite(value) ? Math.max(0, value) : 0).toFixed(Math.max(0, decimals));
  if (!animate) return <span className={classNames("fraym-rolling-number", className)}>{prefix}{formatted}{suffix}</span>;
  return <span aria-label={formatted} className={classNames("fraym-rolling-number", className)}>{prefix}{[...formatted].map((character, index) => character === "." ? <span aria-hidden="true" key={`dot-${index}`}>.</span> : <RollingDigit digit={Number(character)} durationMs={durationMs} key={`${formatted.length - index}-${index > formatted.indexOf(".") ? "fraction" : "integer"}`} />)}{suffix}</span>;
}
