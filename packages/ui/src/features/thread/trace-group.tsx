import type { ReactNode } from "react"; import { classNames } from "../../elements/utils";
export interface TraceGroupProps { readonly children: ReactNode; readonly className?: string }
export function TraceGroup({ children, className }: TraceGroupProps) { return <div className={classNames("fraym-trace-group", className)} data-slot="trace-group">{children}</div>; }
