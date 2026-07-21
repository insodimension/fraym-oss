import { FraymHost } from "@fraym-ai/host";
import { session, workspace } from "./driver";

// The full Fraym shell: session rail, composer, thread, and settings. FraymHost
// owns the session catalog (list/create/select/rename/archive/pin/delete) and the
// theme; everything below is presentation. Swap the driver in src/driver.ts — this
// file stays engine-agnostic.
export function App() {
  return (
    <FraymHost
      drivers={{ session }}
      workspace={workspace}
      storageKey="fraym-web-agent-active-session"
      productLabel="Fraym"
      version="web-agent"
      planLabel="Fixture driver"
      userName="Web agent"
      userEmail="replace src/driver.ts"
      enabledModes={["code"]}
      dockTabs={["insights"]}
    />
  );
}
