import { Link } from "@tanstack/solid-router";
import { For, Show, createMemo, createSignal } from "solid-js";
import { docs, docsByGroup } from "~/docs/registry";
import { groupLabels, groupOrder } from "~/docs/types";

export function DocsSidebar(props: { currentSlug?: string }) {
  const [query, setQuery] = createSignal("");

  const filtered = createMemo(() => {
    const q = query().toLowerCase().trim();
    if (!q) return null;
    return docs.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        d.slug.includes(q) ||
        d.description.toLowerCase().includes(q),
    );
  });

  return (
    <div class="flex flex-col gap-4 px-2 pt-5 pb-10">
      <div class="px-2">
        <label class="relative block">
          <input
            type="search"
            placeholder="Search APIs…"
            value={query()}
            onInput={(e) => setQuery(e.currentTarget.value)}
            class="w-full rounded-md border border-border bg-card/60 px-3 py-2 pl-8 text-sm text-fg placeholder:text-fg-dim focus:border-accent-2 focus:outline-none focus:ring-2 focus:ring-accent-2/20"
          />
          <svg
            class="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-dim"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </label>
      </div>

      <Show
        when={filtered()}
        fallback={
          <For each={groupOrder}>
            {(group) => {
              const items = docsByGroup.get(group) ?? [];
              if (items.length === 0) return null;
              return (
                <section>
                  <div class="px-3 pb-1.5 font-mono text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-fg-dim">
                    {groupLabels[group]}
                  </div>
                  <ul class="flex flex-col">
                    <For each={items}>
                      {(d) => (
                        <li>
                          <NavLink slug={d.slug} title={d.title} currentSlug={props.currentSlug} />
                        </li>
                      )}
                    </For>
                  </ul>
                </section>
              );
            }}
          </For>
        }
      >
        {(items) => (
          <section>
            <div class="px-3 pb-1.5 font-mono text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-fg-dim">
              Results · {items().length}
            </div>
            <ul class="flex flex-col">
              <For
                each={items()}
                fallback={<li class="px-3 py-2 text-sm text-fg-dim">No matches</li>}
              >
                {(d) => (
                  <li>
                    <NavLink slug={d.slug} title={d.title} currentSlug={props.currentSlug} />
                  </li>
                )}
              </For>
            </ul>
          </section>
        )}
      </Show>
    </div>
  );
}

function NavLink(props: { slug: string; title: string; currentSlug?: string }) {
  const active = () => props.currentSlug === props.slug;
  const className = () =>
    `relative block rounded-r-md py-1.5 pl-4 pr-3 text-[0.8125rem] transition-colors ${
      active() ? "text-accent font-semibold" : "text-fg-muted hover:text-fg"
    }`;

  return (
    <Link to="/docs/$slug" params={{ slug: props.slug }} viewTransition={false} class={className()}>
      <Show when={active()}>
        <span class="absolute inset-y-1 left-0 -z-10 w-[2px] rounded-full bg-accent-2" />
      </Show>
      <span class="relative">{props.title}</span>
    </Link>
  );
}
