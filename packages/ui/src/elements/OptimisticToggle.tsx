import { useEffect, useState } from "react";

import { Spinner } from "./Spinner";
import { Toggle, type ToggleProps } from "./Toggle";

export interface OptimisticToggleProps extends Omit<ToggleProps, "onCheckedChange"> { onCheckedChange?: (checked: boolean) => unknown }

export function OptimisticToggle({ checked = false, onCheckedChange, disabled, className, ...props }: OptimisticToggleProps) {
  const [pending, setPending] = useState(false);
  const [local, setLocal] = useState<boolean | null>(null);
  useEffect(() => setLocal(null), [checked]);
  const update = (next: boolean) => { if (!onCheckedChange) return; setLocal(next); setPending(true); Promise.resolve(onCheckedChange(next)).catch(() => undefined).finally(() => { setPending(false); setLocal(null); }); };
  return <span className="fraym-optimistic-toggle">{pending ? <Spinner kind="dots" size="xs" /> : null}<Toggle {...props} checked={local ?? checked} className={className} disabled={disabled} onCheckedChange={update} /></span>;
}
