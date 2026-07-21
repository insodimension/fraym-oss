import { createRoot } from "react-dom/client";
import { App } from "./App";
import "@fraym-ai/ui/theme.css";
import "@fraym-ai/ui/fonts.css";
import "./index.css";

const root = document.getElementById("root");
if (!root) throw new Error("No root element found");

createRoot(root).render(<App />);
