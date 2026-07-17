import type { HTMLAttributes } from "react";

import { classNames } from "./utils";

export type KbdProps = HTMLAttributes<HTMLElement>;

export function Kbd({ className, ...props }: KbdProps) {
  return <kbd {...props} className={classNames("fraym-kbd", className)} />;
}
