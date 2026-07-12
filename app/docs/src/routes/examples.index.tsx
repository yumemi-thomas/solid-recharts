import { Link, createFileRoute } from "@tanstack/solid-router";
import { For, Show, createMemo } from "solid-js";
import * as v from "valibot";
import { ScaledPreview } from "~/components/ScaledPreview";
import { categories, registry, type Category, type RegistryEntry } from "~/examples/registry";

const categoryIds = [
  "line",
  "area",
  "bar",
  "composed",
  "pie",
  "radial",
  "scatter",
  "funnel",
  "hierarchy",
  "axes",
  "tooltip-legend",
  "reference",
  "interaction",
  "shadcn-area",
  "shadcn-bar",
  "shadcn-line",
  "shadcn-pie",
  "shadcn-radar",
  "shadcn-radial",
  "shadcn-tooltip",
] as const satisfies [Category, ...Category[]];

const gallerySearchSchema = v.object({
  cat: v.fallback(v.optional(v.picklist(categoryIds)), undefined),
});

type GallerySearch = v.InferOutput<typeof gallerySearchSchema>;

export const Route = createFileRoute("/examples/")({
  component: Gallery,
  validateSearch: gallerySearchSchema,
});

function Gallery() {
  const search = Route.useSearch();
  const filter = () => search().cat ?? "all";

  const visibleCategories = createMemo(() => {
    const f = filter();
    if (f === "all") return categories;
    return categories.filter((c) => c.id === f);
  });

  const counts = createMemo(() => {
    const map = new Map<Category, number>();
    for (const cat of categories) map.set(cat.id, 0);
    for (const ex of registry) map.set(ex.category, (map.get(ex.category) ?? 0) + 1);
    return map;
  });

  return (
    <>
      <section class="relative mx-auto max-w-[1280px] overflow-hidden px-5 pt-16 pb-10 sm:px-7 sm:pt-24">
        <div class="hero-glow pointer-events-none absolute inset-0 -z-10" />
        <div class="mb-5 flex items-center gap-2 font-mono text-[0.6875rem] font-bold uppercase tracking-[0.16em] text-fg-dim">
          <span class="inline-block h-[6px] w-[6px] rounded-full bg-accent" />
          solid-recharts
          <span class="text-border-strong">·</span>
          <span class="text-accent-3">{registry.length} examples</span>
        </div>
        <h1 class="max-w-[20ch] text-balance text-[clamp(2.25rem,5vw,3.5rem)] leading-[1.04] font-black tracking-[-0.025em] text-fg">
          Charts for SolidJS, <em class="not-italic text-accent-2">by example.</em>
        </h1>
        <p class="mt-5 max-w-[58ch] text-[1.0625rem] leading-[1.65] text-fg-muted">
          A live gallery of every chart family, axis trick, tooltip pattern and interaction —
          running on solid-recharts, TanStack Start and SolidJS 2.0.
        </p>
        <div class="mt-7 flex flex-wrap gap-3">
          <Link
            to="/docs"
            viewTransition={false}
            class="inline-flex items-center gap-2 rounded-md bg-fg px-4 py-2.5 text-[0.875rem] font-semibold text-bg transition hover:bg-accent"
          >
            Read the docs →
          </Link>
          <a
            href="https://github.com/yumemi-thomas/solid-recharts"
            target="_blank"
            rel="noreferrer"
            class="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2.5 text-[0.875rem] font-semibold text-fg transition hover:border-border-strong hover:bg-card-hover"
          >
            View source
          </a>
        </div>
      </section>

      <div class="mx-auto max-w-[1280px] px-5 sm:px-7">
        <div class="border-t border-border" />
      </div>

      <div class="mx-auto flex max-w-[1280px] flex-wrap gap-2 px-5 pt-6 pb-2 sm:px-7">
        <FilterChip label="All" count={registry.length} active={filter() === "all"} to={{}} />
        <For each={categories}>
          {(cat) => (
            <FilterChip
              label={cat.label}
              count={counts().get(cat.id) ?? 0}
              active={filter() === cat.id}
              to={{ cat: cat.id }}
            />
          )}
        </For>
      </div>

      <div class="mx-auto max-w-[1280px] px-5 pt-6 pb-24 sm:px-7">
        <For each={visibleCategories()}>
          {(cat, i) => {
            const items = registry.filter((e) => e.category === cat.id);
            return (
              <Show when={items.length}>
                <section class={i() === 0 ? "" : "mt-14"}>
                  <header class="mb-4 flex items-baseline justify-between border-b border-border pb-2">
                    <h2 class="text-[1.25rem] font-bold tracking-[-0.012em] text-fg">
                      {cat.label}
                    </h2>
                    <span class="text-[0.8125rem] text-fg-muted">{cat.blurb}</span>
                  </header>
                  <div class="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
                    <For each={items}>{(ex) => <ExampleCard ex={ex} />}</For>
                  </div>
                </section>
              </Show>
            );
          }}
        </For>
      </div>
    </>
  );
}

function FilterChip(props: { label: string; count: number; active: boolean; to: GallerySearch }) {
  return (
    <Link
      to="/examples"
      search={props.to}
      replace
      data-active={props.active}
      class="rounded-md border border-border bg-card px-3 py-1.5 text-[0.8125rem] text-fg-muted transition hover:border-border-strong hover:text-fg data-[active=true]:border-fg data-[active=true]:bg-fg data-[active=true]:text-bg"
    >
      {/* Own element per text hole: a bare text expression with an element sibling
          double-escapes ("&" → "&amp;amp;") in Solid 2.0 beta SSR. */}
      <span>{props.label}</span>
      <span class="ml-1.5 font-mono tabular-nums opacity-60">{props.count}</span>
    </Link>
  );
}

function ExampleCard(props: { ex: RegistryEntry }) {
  return (
    <article class="group relative flex flex-col overflow-hidden rounded-md border border-border bg-card transition duration-200 hover:border-accent-2 hover:shadow-soft">
      <Show when={props.ex.tag}>
        <span class="pointer-events-none absolute top-2.5 right-2.5 z-20 rounded border border-border bg-bg/85 px-2 py-0.5 font-mono text-[0.6875rem] text-fg-muted backdrop-blur">
          {props.ex.tag}
        </span>
      </Show>
      {/* Gallery-only: the inner shadcn Card's own border/shadow double up with the
          article border on the white stage — hide them in previews (detail pages
          keep the faithful Card chrome). */}
      <div class="@container relative flex aspect-[16/11] items-start justify-center overflow-hidden bg-white p-3 [&_[data-slot=card]]:border-transparent [&_[data-slot=card]]:shadow-none">
        <ScaledPreview>
          <props.ex.Component />
        </ScaledPreview>
      </div>
      <div class="relative flex flex-col gap-1 border-t border-border px-3.5 pt-3 pb-3.5">
        <Link
          to="/examples/$slug"
          params={{ slug: props.ex.slug }}
          viewTransition={false}
          class="text-[0.9375rem] font-bold text-fg after:absolute after:inset-0 after:content-['']"
          aria-label={`Open ${props.ex.title}`}
        >
          {props.ex.title}
        </Link>
        <div class="text-[0.8125rem] leading-[1.4] text-fg-muted">{props.ex.description}</div>
      </div>
    </article>
  );
}
