import type { ReactNode } from "react";
import "./cinematic.css";
export interface CinematicTextProps {
  caption?: string;
  children: ReactNode;
  align?: "center" | "left" | "right";
  className?: string;
}
export function CinematicText({
  caption,
  children,
  align = "center",
  className,
}: CinematicTextProps) {
  return (
    <div
      className={["aethr-cine", className].filter(Boolean).join(" ")}
      data-align={align}
    >
      {caption ? <p className="aethr-cine__caption">{caption}</p> : null}
      <p className="aethr-cine__line">{children}</p>
    </div>
  );
}
