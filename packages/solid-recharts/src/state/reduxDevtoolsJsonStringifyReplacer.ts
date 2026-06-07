// Ported from recharts 3.8.1 src/state/reduxDevtoolsJsonStringifyReplacer.ts
// Pure util — no framework surface — behavior is byte-identical to recharts.

export function reduxDevtoolsJsonStringifyReplacer(key: string, value: unknown) {
  if (value instanceof HTMLElement) {
    return `HTMLElement <${value.tagName} class="${value.className}">`;
  }
  if (value === window) {
    return "global.window";
  }
  if (key === "children" && typeof value === "object" && value !== null) {
    return "<<CHILDREN>>";
  }
  return value;
}
