import type { HTMLAttributes } from "react";

import { classNames } from "./utils";

export type CardProps = HTMLAttributes<HTMLDivElement>;

export function Card({ className, ...props }: CardProps) {
  return <div {...props} className={classNames("fraym-card", className)} />;
}

export type CardHeaderProps = HTMLAttributes<HTMLDivElement>;

export function CardHeader({ className, ...props }: CardHeaderProps) {
  return (
    <div {...props} className={classNames("fraym-card__header", className)} />
  );
}

export type CardContentProps = HTMLAttributes<HTMLDivElement>;

export function CardContent({ className, ...props }: CardContentProps) {
  return (
    <div {...props} className={classNames("fraym-card__content", className)} />
  );
}

export type CardFooterProps = HTMLAttributes<HTMLDivElement>;

export function CardFooter({ className, ...props }: CardFooterProps) {
  return (
    <div {...props} className={classNames("fraym-card__footer", className)} />
  );
}
