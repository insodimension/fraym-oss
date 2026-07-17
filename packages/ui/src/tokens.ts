export const tokens = {
  color: {
    bg: "var(--fraym-color-bg)",
    surface: "var(--fraym-color-surface)",
    border: "var(--fraym-color-border)",
    text: "var(--fraym-color-text)",
    muted: "var(--fraym-color-muted)",
    accent: "var(--fraym-color-accent)",
    success: "var(--fraym-color-success)",
    warning: "var(--fraym-color-warning)",
    danger: "var(--fraym-color-danger)",
  },
  type: {
    family: "var(--fraym-font-sans)",
    xs: "var(--fraym-type-xs)",
    sm: "var(--fraym-type-sm)",
    base: "var(--fraym-type-base)",
    lg: "var(--fraym-type-lg)",
    xl: "var(--fraym-type-xl)",
  },
  space: {
    1: "var(--fraym-space-1)",
    2: "var(--fraym-space-2)",
    3: "var(--fraym-space-3)",
    4: "var(--fraym-space-4)",
    5: "var(--fraym-space-5)",
    6: "var(--fraym-space-6)",
    8: "var(--fraym-space-8)",
    10: "var(--fraym-space-10)",
  },
  radius: {
    sm: "var(--fraym-radius-sm)",
    md: "var(--fraym-radius-md)",
    lg: "var(--fraym-radius-lg)",
    full: "var(--fraym-radius-full)",
  },
  motion: {
    fast: "var(--fraym-motion-fast)",
    normal: "var(--fraym-motion-normal)",
    slow: "var(--fraym-motion-slow)",
  },
} as const;

export type FraymTokens = typeof tokens;
export type FraymColorToken = keyof FraymTokens["color"];
