import { SessionThread } from "@fraym/ui";
import { source } from "./driver";

export function App() {
  return (
    <div className="flex h-dvh min-h-0 min-w-0 flex-col overflow-hidden bg-fr-bg font-primary text-fr-text">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-fr-border bg-fr-rail px-3 py-2 sm:px-4">
        <div className="min-w-0">
          <h1 className="truncate text-fr-sm font-semibold tracking-fr-tight">Web agent</h1>
          <p className="hidden truncate text-fr-xs text-fr-text-3 sm:block">Fraym cockpit</p>
        </div>
        <p
          className="shrink-0 whitespace-nowrap rounded-full border border-fr-border-soft bg-fr-surface px-2 py-1 font-secondary text-fr-2xs text-fr-text-2"
          role="status"
        >
          Demo driver <span aria-hidden="true">·</span> replace src/driver.ts
        </p>
      </header>
      <main className="min-h-0 min-w-0 flex-1 overflow-hidden" aria-label="Agent cockpit">
        <SessionThread className="h-full min-h-0 min-w-0" source={source} title="Web agent" />
      </main>
    </div>
  );
}
