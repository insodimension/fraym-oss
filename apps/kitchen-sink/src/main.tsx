import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App";
import "./styles.css";
import "@fraym/ui/fonts.css";
import "@fraym/ui/theme.css";
import "@fraym/vibr/avatars.css";
import "@fraym/aethr/cinematic.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element not found");
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
