import "@fraym-ai/ui/theme.css";
import "@fraym-ai/ui/fonts.css";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./index.css";

const root = document.getElementById("root");

if (!root) throw new Error("Root element not found");

createRoot(root).render(<App />);
