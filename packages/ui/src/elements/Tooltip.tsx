import { cloneElement, createContext, type HTMLAttributes, type ReactElement, type ReactNode, useContext, useId, useMemo } from "react";

import { classNames } from "./utils";

interface TooltipContextValue { id: string }
const TooltipContext = createContext<TooltipContextValue | null>(null);

export interface TooltipProps {
  children: ReactNode;
  content?: ReactNode;
  className?: string;
}

export function TooltipProvider({ children }: { children?: ReactNode; delayDuration?: number }) { return <>{children}</>; }

export function Tooltip({ children, className, content }: TooltipProps) {
  const id = useId();
  const context = useMemo(() => ({ id }), [id]);
  if (content !== undefined && isElement(children)) {
    const describedBy = [children.props["aria-describedby"], id].filter(Boolean).join(" ");
    return <span className={classNames("fraym-tooltip", className)} data-slot="tooltip">{cloneElement(children, { "aria-describedby": describedBy })}<span className="fraym-tooltip__content" id={id} role="tooltip">{content}</span></span>;
  }
  return <TooltipContext.Provider value={context}><span className={classNames("fraym-tooltip", className)} data-slot="tooltip">{children}</span></TooltipContext.Provider>;
}

function isElement(value: ReactNode): value is ReactElement<{ "aria-describedby"?: string }> {
  return typeof value === "object" && value !== null && "props" in value;
}

export function TooltipTrigger({ children, ...props }: { children: ReactElement<{ "aria-describedby"?: string }>; asChild?: boolean }) {
  const context = useContext(TooltipContext);
  return cloneElement(children, { ...props, "aria-describedby": [children.props["aria-describedby"], context?.id].filter(Boolean).join(" ") });
}

export function TooltipContent({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  const context = useContext(TooltipContext);
  return <span {...props} className={classNames("fraym-tooltip__content", className)} id={context?.id} role="tooltip" />;
}
