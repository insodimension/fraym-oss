import { Fragment, type ReactNode, useId } from "react";

import { useReducedMotion } from "./MediaQueries";
import { classNames } from "./utils";

export interface ElectricBorderProps {
  children: ReactNode;
  className?: string;
  color?: string;
  speed?: number;
  chaos?: number;
  thickness?: number;
  borderRadius?: number;
}

const streams = [
  { name: "north", seed: 1, axis: "dy", values: "700;0" },
  { name: "south", seed: 1, axis: "dy", values: "0;-700" },
  { name: "east", seed: 2, axis: "dx", values: "490;0" },
  { name: "west", seed: 2, axis: "dx", values: "0;-490" },
] as const;

export function ElectricBorder({
  children,
  className,
  color = "var(--fraym-color-accent)",
  speed = 1,
  chaos = 1,
  thickness = 2,
  borderRadius = 16,
}: ElectricBorderProps) {
  const reducedMotion = useReducedMotion();
  const filterId = `fraym-electric-${useId().replaceAll(":", "")}`;
  const duration = `${6 / Math.max(speed, 0.1)}s`;

  return (
    <div
      className={classNames("fraym-electric-border", className)}
      data-slot="electric-border"
      style={{ "--electric-color": color, "--electric-radius": `${borderRadius}px`, "--electric-width": `${thickness}px` } as React.CSSProperties}
    >
      <svg aria-hidden="true" className="fraym-electric-border__filter" focusable="false">
        <defs>
          <filter id={filterId} colorInterpolationFilters="sRGB" x="-50%" y="-50%" width="200%" height="200%">
            {streams.map(({ name, seed, axis, values }) => (
              <Fragment key={name}>
                <feTurbulence type="turbulence" baseFrequency=".02" numOctaves={10} seed={seed} result={`${name}-grain`} />
                <feOffset in={`${name}-grain`} dx="0" dy="0" result={name}>
                  {!reducedMotion && <animate attributeName={axis} values={values} dur={duration} repeatCount="indefinite" />}
                </feOffset>
              </Fragment>
            ))}
            <feComposite in="north" in2="south" result="vertical" />
            <feComposite in="east" in2="west" result="horizontal" />
            <feBlend in="vertical" in2="horizontal" mode="color-dodge" result="field" />
            <feDisplacementMap in="SourceGraphic" in2="field" scale={30 * chaos} xChannelSelector="R" yChannelSelector="B" />
          </filter>
        </defs>
      </svg>
      <span aria-hidden="true" className="fraym-electric-border__edge" style={{ filter: `url(#${filterId})` }} />
      <span aria-hidden="true" className="fraym-electric-border__edge fraym-electric-border__edge--near" style={{ filter: `url(#${filterId}) blur(1px)` }} />
      <span aria-hidden="true" className="fraym-electric-border__edge fraym-electric-border__edge--far" style={{ filter: `url(#${filterId}) blur(4px)` }} />
      <span aria-hidden="true" className="fraym-electric-border__bloom" />
      <div className="fraym-electric-border__content">{children}</div>
    </div>
  );
}
