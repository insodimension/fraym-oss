import { createRoot } from "react-dom/client";
import { FraymHost } from "@fraym-ai/host";
import { resourceDriver } from "./local-resource-driver";
import { createLocalSessionDriver } from "./local-session-driver";
import { MODELS_SETTINGS_PANEL } from "./models-panel";
import { loadConnection, PROVIDERS, workspace } from "./providers";

import "@fraym-ai/ui/theme.css";
import "@fraym-ai/ui/fonts.css";
import "./styles.css";

const connection = loadConnection();
const driver = createLocalSessionDriver({
  workspace,
  defaultModel: connection
    ? { provider: connection.provider, modelId: connection.model }
    : { provider: "openrouter", modelId: PROVIDERS.openrouter.defaultModel },
});

const root = document.getElementById("root");
if (!root) {
  throw new Error("No root element found");
}

createRoot(root).render(
  <FraymHost
    drivers={{ session: driver, resources: resourceDriver }}
    workspace={workspace}
    storageKey="fraym-aisdk-active-session"
    settingsPanels={[MODELS_SETTINGS_PANEL]}
    productLabel="Fraym"
    version="aisdk-web"
    planLabel="browser-local"
    userName="Local profile"
    userEmail="keys stay in this browser"
    enabledModes={["code"]}
    dockTabs={["insights"]}
  />,
);
