import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Thread } from "@fraym/ui";

import "./styles.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element not found");
}

createRoot(root).render(
  <StrictMode>
    <main>
      <header>
        <span>FRAYM</span>
        <h1>Agent UI playground</h1>
        <p>A first-class surface for agentic products.</p>
      </header>
      <Thread />
    </main>
  </StrictMode>,
);

