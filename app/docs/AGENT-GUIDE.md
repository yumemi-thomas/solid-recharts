# Docs content guide (for contributors/agents)

How to add a documentation page + live example to the solid-recharts docs app.

## Files

- Doc pages: `app/docs/src/docs/api/<slug>.mdx` — auto-registered via glob.
- Examples: `app/docs/src/examples/<slug>.tsx` — auto-registered via glob.
- Shared datasets: `app/docs/src/examples/data.ts` — reuse these; only add a dataset if nothing fits.

## MDX page format

Study `src/docs/api/line-chart.mdx` (component page) and `src/docs/api/getting-started.mdx`
(guide) first — copy their structure exactly.

Required `meta` export at the top (plain JS object, no TS):

```js
export const meta = {
  slug: "bar-chart", // kebab-case, matches filename
  title: "BarChart", // exact exported component name (or guide title)
  group: "charts", // "guides" | "charts" | "general" | "cartesian" | "polar"
  description: "One sentence for index/search.",
  example: "bar-basic", // primary example slug (optional)
  order: 0, // only for guides / first page of a group
};
```

Page structure: `# Title` → one-paragraph intro (what it is, when to use) → minimal
code fence (` ```tsx `) → `<Example slug="…" />` → `## Props` table (the 6–12 most
useful props: name, type, default, description) → `## Notes` (gotchas, port specifics)
→ `## See also` with `/docs/<slug>` links.

Available MDX components (no import needed): `<Example slug="…" />`,
`<CodeBlock lang="tsx" filename="…">…</CodeBlock>`, `<InstallCommand pkg="…" />`.
Plain code fences work too.

## Example file format

Study `src/examples/line-basic.tsx` and `src/examples/pie-donut.tsx` first.

```tsx
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "solid-recharts";
import { pageStats } from "./data";

export const meta = {
  slug: "bar-stacked",
  title: "Stacked bar chart",
  category: "bar", // see Category union in src/examples/registry.ts
  description: "One sentence shown on the card.",
  tag: "BarChart", // main API shown
} as const;

export default function BarStacked() {
  return (
    <div class="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={pageStats}>…</BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

Rules:

- Root element is exactly `<div class="h-[300px] w-full">` containing a
  `ResponsiveContainer width="100%" height="100%"` (charts need a definite box).
  Treemap/Sankey/Sunburst also follow this pattern.
- The whole file is shown as copyable source — keep it minimal and self-contained.
- The file renders in a card preview scaled to ~50% — avoid tiny font tricks.

## Hard rules (Solid 2.0 + this port)

1. **camelCase SVG props only**: `strokeDasharray="3 3"`, never `stroke-dasharray`.
   (On plain HTML/SVG elements outside the chart, normal Solid kebab attributes are fine.)
2. **`class`, not `className`.**
3. **No `key` prop.** Iterate with `<For each={…}>{(item, i) => …}</For>` (index is an
   accessor: `i()`).
4. Conditional rendering with `<Show when={…}>`, not ternaries.
5. Interactive examples: `createSignal` from `"solid-js"`; read signals as `value()`.
6. Don't invent props. Verify against the port's prop types in
   `packages/solid-recharts/src/**` (each component exports a `Props` type) — the API
   matches recharts 3.x. If a recharts prop doesn't exist in the port's types, leave it
   out of the Props table.
7. Charts default to recharts default colors — use the classic palette
   (`#8884d8`, `#82ca9d`, `#ffc658`, and `PIE_COLORS` from `data.ts`).
8. Internal doc links: `/docs/<slug>`. Don't link to slugs that won't exist
   (check your batch list + the seeds).

## Verify

From `app/docs`: `npx tsc --noEmit` must pass (ignore pre-existing errors in files you
didn't touch). Do not run the dev server.
