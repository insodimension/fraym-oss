export function toTermLines(text: string): readonly (readonly string[])[] { return text.replaceAll("\r\n", "\n").split("\n").map(line => [line]); }
