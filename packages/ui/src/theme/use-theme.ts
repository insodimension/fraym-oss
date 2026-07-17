import { useContext } from "react";
import { ThemeContext, type ThemeContextValue } from "./provider";
export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme must be used inside ThemeProvider");
  return value;
}
