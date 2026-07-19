import { createRoot } from "react-dom/client";
import { App } from "./App";
import "@fraym/ui/theme.css";
import "@fraym/ui/fonts.css";
import "./index.css";

const root = document.getElementById("root");
if (!root) throw new Error("No root element found");

createRoot(root).render(<App />);
