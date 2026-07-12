import { type Component } from "solid-js";

export type Category =
  | "line"
  | "area"
  | "bar"
  | "composed"
  | "pie"
  | "radial"
  | "scatter"
  | "funnel"
  | "hierarchy"
  | "axes"
  | "tooltip-legend"
  | "reference"
  | "interaction"
  | "shadcn-area"
  | "shadcn-bar"
  | "shadcn-line"
  | "shadcn-pie"
  | "shadcn-radar"
  | "shadcn-radial"
  | "shadcn-tooltip";

export interface ExampleMeta {
  slug: string;
  title: string;
  category: Category;
  description: string;
  tag?: string;
}

export interface ExampleModule {
  default: Component;
  meta: ExampleMeta;
}

export const categories: { id: Category; label: string; blurb: string }[] = [
  { id: "line", label: "Line", blurb: "trends, multiple series, custom dots" },
  { id: "area", label: "Area", blurb: "filled trends, stacking, gradients" },
  { id: "bar", label: "Bar", blurb: "grouped, stacked and shaped bars" },
  { id: "composed", label: "Composed", blurb: "mixing line, area and bar in one chart" },
  { id: "pie", label: "Pie", blurb: "pies, donuts, labels and cells" },
  { id: "radial", label: "Radial", blurb: "radar and radial bar charts" },
  { id: "scatter", label: "Scatter", blurb: "point clouds, bubbles, three axes" },
  { id: "funnel", label: "Funnel", blurb: "conversion funnels and trapezoids" },
  { id: "hierarchy", label: "Hierarchy", blurb: "treemap, sankey and sunburst" },
  { id: "axes", label: "Axes & Grid", blurb: "axis config, ticks, labels, grids" },
  { id: "tooltip-legend", label: "Tooltip & Legend", blurb: "hover info and series legends" },
  { id: "reference", label: "References", blurb: "reference lines, areas and error bars" },
  { id: "interaction", label: "Interaction", blurb: "brush, click handlers, active shapes" },
  { id: "shadcn-area", label: "Shadcn - Area Chart", blurb: "shadcn/ui area chart blocks" },
  { id: "shadcn-bar", label: "Shadcn - Bar Chart", blurb: "shadcn/ui bar chart blocks" },
  { id: "shadcn-line", label: "Shadcn - Line Chart", blurb: "shadcn/ui line chart blocks" },
  { id: "shadcn-pie", label: "Shadcn - Pie Chart", blurb: "shadcn/ui pie chart blocks" },
  { id: "shadcn-radar", label: "Shadcn - Radar Chart", blurb: "shadcn/ui radar chart blocks" },
  { id: "shadcn-radial", label: "Shadcn - Radial Chart", blurb: "shadcn/ui radial chart blocks" },
  { id: "shadcn-tooltip", label: "Shadcn - Tooltip", blurb: "shadcn/ui chart tooltip variants" },
];

const metadata = import.meta.glob<ExampleMeta>("./*.tsx", { eager: true, import: "meta" });
const modules = import.meta.glob<ExampleModule>("./*.tsx", { eager: true });
const sources = import.meta.glob<string>("./*.tsx", {
  query: "?raw",
  import: "default",
});

export interface RegistryEntry extends ExampleMeta {
  Component: Component;
  loadSource: () => Promise<string>;
  loadSourceHtml: () => Promise<string>;
}

function cached<T>(loader: () => Promise<T>) {
  let promise: Promise<T> | undefined;
  return () => {
    promise ??= loader();
    return promise;
  };
}

export const registry: RegistryEntry[] = Object.entries(metadata)
  .map(([path, meta]) => {
    const loadModule = modules[path];
    const loadSource = sources[path];
    if (!meta || !loadModule || !loadSource) return null;

    const source = cached(loadSource);
    const sourceHtml = cached(async () => {
      const { highlight } = await import("~/docs/highlighter");
      return highlight(await source(), "tsx");
    });

    const entry: RegistryEntry = {
      ...meta,
      Component: loadModule.default,
      loadSource: source,
      loadSourceHtml: sourceHtml,
    };
    return entry;
  })
  .filter((x): x is RegistryEntry => x !== null)
  // Deterministic sort by slug — localeCompare can differ between SSR (Node
  // locale) and client (browser locale), which would shift card order and
  // break hydration.
  .sort((a, b) => (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));

export const registryBySlug = new Map(registry.map((e) => [e.slug, e]));
export const registryByCategory = (cat: Category) => registry.filter((e) => e.category === cat);
