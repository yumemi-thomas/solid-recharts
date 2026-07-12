import { Link, createFileRoute, notFound } from "@tanstack/solid-router";
import { Dynamic } from "@solidjs/web";
import { Show, createMemo } from "solid-js";
import { docs, docsBySlug } from "~/docs/registry";
import { mdxComponents } from "~/docs/mdx-components";
import { groupLabels } from "~/docs/types";

export const Route = createFileRoute("/docs/$slug")({
  component: DocPage,
  beforeLoad: ({ params }) => {
    if (!docsBySlug.has(params.slug)) throw notFound();
  },
});

function DocPage() {
  const params = Route.useParams();
  const entry = createMemo(() => {
    const doc = docsBySlug.get(params().slug);
    if (doc === undefined) throw notFound();
    return doc;
  });
  const idx = createMemo(() => docs.findIndex((d) => d.slug === params().slug));
  const prev = createMemo(() => {
    const index = idx();
    return index > 0 ? docs[index - 1] : undefined;
  });
  const next = createMemo(() => {
    const index = idx();
    return index < docs.length - 1 ? docs[index + 1] : undefined;
  });

  return (
    <article class="mx-auto max-w-[820px] px-4 py-10 sm:px-8 sm:py-14">
      <div class="mb-3 flex flex-wrap items-center gap-1.5 text-[0.75rem] text-fg-dim">
        <Link to="/docs" viewTransition={false} class="hover:text-fg">
          Docs
        </Link>
        <span>/</span>
        <span>{groupLabels[entry().group]}</span>
        <span>/</span>
        <span class="text-fg font-mono">{entry().title}</span>
      </div>

      <div class="docs-prose">
        {/* MDX content resolves <Example>/<CodeBlock>/<InstallCommand> from
            props.components — Dynamic forwards the extra prop through. */}
        <Dynamic component={entry().Component} components={mdxComponents} />
      </div>

      <nav class="mt-16 flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:justify-between">
        <Show when={prev()} fallback={<span />}>
          {(p) => (
            <Link
              to="/docs/$slug"
              params={{ slug: p().slug }}
              viewTransition={false}
              class="group flex flex-col rounded-xl border border-border bg-card px-4 py-3 transition hover:border-border-strong hover:bg-card-hover"
            >
              <span class="text-[0.6875rem] uppercase tracking-[0.12em] text-fg-dim">
                ← Previous
              </span>
              <span class="font-mono text-sm text-fg">{p().title}</span>
            </Link>
          )}
        </Show>
        <Show when={next()} fallback={<span />}>
          {(n) => (
            <Link
              to="/docs/$slug"
              params={{ slug: n().slug }}
              viewTransition={false}
              class="group flex flex-col rounded-xl border border-border bg-card px-4 py-3 text-right transition hover:border-border-strong hover:bg-card-hover"
            >
              <span class="text-[0.6875rem] uppercase tracking-[0.12em] text-fg-dim">Next →</span>
              <span class="font-mono text-sm text-fg">{n().title}</span>
            </Link>
          )}
        </Show>
      </nav>
    </article>
  );
}
