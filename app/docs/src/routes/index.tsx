import { Link, createFileRoute } from "@tanstack/solid-router";
import { For, Show } from "solid-js";
import { Dynamic } from "@solidjs/web";
import type { JSX } from "@solidjs/web";
import { ScaledPreview } from "~/components/ScaledPreview";
import { docs, docsByGroup } from "~/docs/registry";
import { groupLabels, groupOrder, type DocGroup } from "~/docs/types";
import { registry } from "~/examples/registry";

export const Route = createFileRoute("/")({
  component: Landing,
});

const featured = [
  { slug: "line-basic" },
  { slug: "area-stacked" },
  { slug: "bar-basic" },
  { slug: "pie-donut" },
] as const;

const cardIcons: Record<DocGroup, () => JSX.Element> = {
  guides: () => (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.6"
      aria-hidden="true"
    >
      <path d="M4 4h12a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3z" />
      <path d="M4 17a3 3 0 0 1 3-3h12" />
    </svg>
  ),
  charts: () => (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.6"
      aria-hidden="true"
    >
      <path d="M3 3v18h18" />
      <path d="M7 14l4-5 3 3 5-7" />
    </svg>
  ),
  general: () => (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.6"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  cartesian: () => (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.6"
      aria-hidden="true"
    >
      <path d="M4 4v16" />
      <path d="M4 20h16" />
      <path d="M8 16v-6" />
      <path d="M13 16V7" />
      <path d="M18 16v-3" />
    </svg>
  ),
  polar: () => (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.6"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 3v18" />
      <path d="M3 12h18" />
    </svg>
  ),
};

function Landing() {
  return (
    <>
      <section class="relative mx-auto max-w-[860px] overflow-hidden px-5 pt-16 pb-10 sm:px-7 sm:pt-24 text-center">
        <div class="hero-glow pointer-events-none absolute inset-0 -z-10" />
        <h1 class="text-[clamp(2.25rem,5vw,3.25rem)] font-black tracking-[-0.02em] text-fg leading-[1.08]">
          Recharts <span class="text-accent">for SolidJS</span>,
          <br />
          documented.
        </h1>
        <p class="mx-auto mt-5 max-w-[58ch] text-[1.0625rem] leading-[1.6] text-fg-muted">
          The recharts composable charting API, rebuilt on Solid 2.0 fine-grained reactivity — every
          chart and component with a live example you can copy.
        </p>
        <div class="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/docs"
            viewTransition={false}
            class="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2.5 text-[0.875rem] font-semibold text-white transition hover:bg-accent-deep"
          >
            Read the docs <span aria-hidden="true">→</span>
          </Link>
          <Link
            to="/examples"
            viewTransition={false}
            class="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2.5 text-[0.875rem] font-semibold text-fg transition hover:border-border-strong hover:bg-card-hover"
          >
            Browse {registry.length} examples
          </Link>
        </div>
        <div class="mt-6 font-mono text-[0.75rem] uppercase tracking-[0.18em] text-fg-dim">
          solid-recharts · {docs.length} APIs · {registry.length} examples
        </div>
      </section>

      <section class="mx-auto max-w-[1100px] px-5 pt-10 pb-16 sm:px-7">
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <For each={groupOrder}>
            {(group) => {
              const items = docsByGroup.get(group) ?? [];
              const first = items[0];
              const Icon = cardIcons[group];
              return (
                <Link
                  to={first ? "/docs/$slug" : "/docs"}
                  params={first ? { slug: first.slug } : undefined}
                  viewTransition={false}
                  class="group relative flex flex-col gap-3 rounded-lg border border-border bg-card p-5 transition hover:border-accent hover:bg-card-hover"
                >
                  <span class="inline-flex h-9 w-9 items-center justify-center rounded-md bg-accent/10 text-accent">
                    <Icon />
                  </span>
                  <div>
                    <div class="flex items-baseline gap-2">
                      <span class="text-[1rem] font-bold text-accent group-hover:underline">
                        {groupLabels[group]}
                      </span>
                      <span class="font-mono text-[0.6875rem] text-fg-dim">{items.length}</span>
                    </div>
                    <p class="mt-1 text-[0.8125rem] leading-[1.45] text-fg-muted">
                      {summaries[group]}
                    </p>
                  </div>
                </Link>
              );
            }}
          </For>
        </div>
      </section>

      <section class="mx-auto max-w-[1100px] px-5 pt-2 pb-24 sm:px-7">
        <div class="mb-5 flex items-baseline justify-between border-b border-border pb-2">
          <h2 class="text-[1.125rem] font-bold tracking-[-0.01em] text-fg">Featured examples</h2>
          <Link to="/examples" viewTransition={false} class="text-sm text-accent hover:underline">
            View all →
          </Link>
        </div>
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <For each={featured}>
            {(f) => {
              const ex = registry.find((e) => e.slug === f.slug);
              return (
                <Show when={ex}>
                  {(example) => (
                    <Link
                      to="/examples/$slug"
                      params={{ slug: example().slug }}
                      viewTransition={false}
                      class="group flex flex-col overflow-hidden rounded-lg border border-border bg-card transition hover:border-accent hover:shadow-soft"
                    >
                      <div class="stage-grad flex aspect-[16/10] items-center justify-center overflow-hidden p-2">
                        <ScaledPreview>
                          <Dynamic component={example().Component} />
                        </ScaledPreview>
                      </div>
                      <div class="flex flex-col gap-1 border-t border-border px-3.5 py-3">
                        <span class="text-[0.9375rem] font-bold text-fg">{example().title}</span>
                        <span class="text-[0.8125rem] leading-[1.4] text-fg-muted">
                          {example().description}
                        </span>
                      </div>
                    </Link>
                  )}
                </Show>
              );
            }}
          </For>
        </div>
      </section>
    </>
  );
}

const summaries: Record<DocGroup, string> = {
  guides: "Install, compose a chart, migrate from recharts.",
  charts: "LineChart, BarChart, PieChart, Treemap, Sankey…",
  general: "ResponsiveContainer, Tooltip, Legend, Cell, Label…",
  cartesian: "Line, Bar, Area, XAxis, Brush, ReferenceLine…",
  polar: "Pie, Radar, RadialBar, PolarGrid, polar axes…",
};
