import "@fraym-ai/ui/theme.css";
import "@fraym-ai/ui/architecture.css";
import "@fraym-ai/ui/fonts.css";
import "./index.css";

import { ThemeProvider } from "@fraym-ai/ui/theme";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { KitchenSink } from "./kitchen-sink";

const container = document.getElementById("root");
if (!container) {
	throw new Error("Fraym kitchen-sink: missing #root element");
}

createRoot(container).render(
	<StrictMode>
		<ThemeProvider>
			<KitchenSink />
		</ThemeProvider>
	</StrictMode>,
);
