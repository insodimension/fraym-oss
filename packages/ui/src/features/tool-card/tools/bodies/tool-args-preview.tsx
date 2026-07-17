import { classNames } from "../../../../elements/utils";
import { isRecord, prettyValue } from "../../../../tool-renderers/data";
export interface ToolArgsPreviewProps { readonly args: unknown; readonly maxValueLength?: number; readonly className?: string }
export function ToolArgsPreview({ args, maxValueLength = 80, className }: ToolArgsPreviewProps) { if (!isRecord(args)) return null; return <dl className={classNames("fraym-tool-args", className)}>{Object.entries(args).map(([key, value]) => { const text = prettyValue(value); return <div key={key}><dt>{key}</dt><dd title={text}>{text.length > maxValueLength ? `${text.slice(0, maxValueLength)}…` : text}</dd></div>; })}</dl>; }
