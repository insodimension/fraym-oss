import type { ReactNode } from "react";
import { classNames } from "../../elements/utils";

export interface ToolBodyCardProps { readonly toolbar?: ReactNode; readonly children: ReactNode; readonly className?: string }
export function ToolBodyCard({ toolbar, children, className }: ToolBodyCardProps) { return <section className={classNames("fraym-tool-body-card", className)}>{toolbar ? <header>{toolbar}</header> : null}<div>{children}</div></section>; }

export interface ToolBodySectionProps { readonly title?: ReactNode; readonly trailing?: ReactNode; readonly children: ReactNode; readonly className?: string; readonly flush?: boolean }
export function ToolBodySection({ title, trailing, children, className, flush = false }: ToolBodySectionProps) { return <section className={classNames("fraym-tool-body-section", flush && "is-flush", className)}>{title || trailing ? <header><strong>{title}</strong>{trailing}</header> : null}<div>{children}</div></section>; }
