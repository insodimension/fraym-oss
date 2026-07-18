import "@fraym/ui/theme.css";
import "@fraym/ui/architecture.css";
import "@fraym/ui/fonts.css";
import "./index.css";

import { ThemeProvider } from "@fraym/ui/theme";
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
