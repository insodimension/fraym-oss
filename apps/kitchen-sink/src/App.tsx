import { ThemeProvider } from "@fraym/ui";
import { KitchenSink } from "./kitchen-sink";

export function App() {
  return (
    <ThemeProvider defaultAccent="violet">
      <KitchenSink />
    </ThemeProvider>
  );
}
