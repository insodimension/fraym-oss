import { classNames } from "./utils";

export interface BranchNameProps { name: string; className?: string }

export function BranchName({ name, className }: BranchNameProps) {
  const slash = name.lastIndexOf("/");
  const prefix = slash < 0 ? "" : name.slice(0, slash + 1);
  const leaf = slash < 0 ? name : name.slice(slash + 1);
  const tailLength = leaf.length > 16 ? 8 : 0;
  return <span className={classNames("fraym-branch-name", className)} data-slot="branch-name" title={name}>{prefix ? <span className="fraym-branch-name__prefix">{prefix}</span> : null}<span className="fraym-branch-name__head">{tailLength ? leaf.slice(0, -tailLength) : leaf}</span>{tailLength ? <span className="fraym-branch-name__tail">{leaf.slice(-tailLength)}</span> : null}</span>;
}
