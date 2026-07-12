import { Link, createFileRoute } from "@tanstack/solid-router";
import { For, Show } from "solid-js";
import { docs, docsByGroup } from "~/docs/registry";
import { groupLabels, groupOrder } from "~/docs/types";

export const Route = createFileRoute("/docs/")({
  component: DocsIndex,
});

function DocsIndex() {
  return (
    <article class="mx-auto max-w-[820px] px-4 py-10 sm:px-8 sm:py-14">
      <div class="mb-2 font-mono text-[0.6875rem] font-bold uppercase tracking-[0.16em] text-accent">
        Documentation
      </div>
      <h1 class="text-[clamp(2rem,4vw,2.625rem)] font-black tracking-[-0.022em] text-fg">
        Solid Recharts
      </h1>
      <p class="mt-4 max-w-[62ch] text-[1.0625rem] leading-[1.65] text-fg-muted">
        A Solid-native port of recharts that keeps the recharts composable API —{" "}
        <code class="rounded border border-border bg-card px-1 py-px font-mono text-[0.875em] text-accent">
          LineChart
        </code>
        ,{" "}
        <code class="rounded border border-border bg-card px-1 py-px font-mono text-[0.875em] text-accent">
          XAxis
        </code>
        ,{" "}
        <code class="rounded border border-border bg-card px-1 py-px font-mono text-[0.875em] text-accent">
          Tooltip
        </code>
        , and friends — rebuilt on Solid 2.0 fine-grained reactivity, with no Redux and a much
        smaller bundle. Every public API has its own page below with a live example.
      </p>

      <div class="mt-12 flex flex-col gap-10">
        <For each={groupOrder}>
          {(group) => {
            const items = docsByGroup.get(group) ?? [];
            return (
              <Show when={items.length > 0}>
                <section>
                  <header class="mb-3 flex items-baseline justify-between border-b border-border pb-2">
                    <h2 class="text-[1.25rem] font-bold tracking-[-0.012em] text-fg">
                      {groupLabels[group]}
                    </h2>
                    <span class="font-mono text-[0.75rem] text-fg-dim">
                      {items.length} {items.length === 1 ? "API" : "APIs"}
                    </span>
                  </header>
                  <div class="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
                    <For each={items}>
                      {(d) => (
                        <Link
                          to="/docs/$slug"
                          params={{ slug: d.slug }}
                          viewTransition={false}
                          class="group -mx-3 flex flex-col gap-0.5 rounded-lg border-b border-border px-3 py-2.5 transition-colors hover:bg-card"
                        >
                          <span class="font-mono text-[0.875rem] font-medium text-accent-2 group-hover:underline">
                            {d.title}
                          </span>
                          <span class="text-[0.8125rem] leading-[1.45] text-fg-muted">
                            {d.description}
                          </span>
                        </Link>
                      )}
                    </For>
                  </div>
                </section>
              </Show>
            );
          }}
        </For>
      </div>

      <p class="mt-14 border-t border-border pt-6 text-sm text-fg-muted">
        {docs.length} APIs documented · Looking for a runnable demo?{" "}
        <Link
          to="/examples"
          viewTransition={false}
          class="text-accent-2 underline decoration-border underline-offset-2 hover:decoration-accent-2"
        >
          Browse examples →
        </Link>
      </p>
    </article>
  );
}
