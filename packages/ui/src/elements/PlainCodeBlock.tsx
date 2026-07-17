import { memo } from "react";

import { classNames } from "./utils";

export interface PlainCodeBlockProps { code: string; lineNumbers?: boolean; startLine?: number; className?: string; codeClassName?: string }

export const PlainCodeBlock = memo(function PlainCodeBlock({ code, lineNumbers = false, startLine = 1, className, codeClassName }: PlainCodeBlockProps) {
  return <pre className={classNames("fraym-plain-code", lineNumbers && "fraym-plain-code--numbered", className)}><code className={codeClassName}>{lineNumbers ? code.split("\n").map((line, index) => <span className="fraym-plain-code__line" key={index}><span className="fraym-plain-code__number">{startLine + index}</span><span>{line || " "}</span></span>) : code}</code></pre>;
});
