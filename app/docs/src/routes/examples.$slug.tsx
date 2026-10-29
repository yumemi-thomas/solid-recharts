import { Link, createFileRoute, notFound } from "@tanstack/solid-router";
import { Dynamic } from "@solidjs/web";
import { Show, createMemo, createSignal, onCleanup, onSettled } from "solid-js";
import { categories, registry, registryBySlug } from "~/examples/registry";
import type { HighlightedTree } from "~/docs/highlighter";
import { HighlightedCode } from "~/docs/components/HighlightedCode";

export const Route = createFileRoute("/examples/$slug")({
  component: ExamplePage,
  beforeLoad: ({ params }) => {
    if (!registryBySlug.has(params.slug)) throw notFound();
  },
});

function ExamplePage() {
  const params = Route.useParams();
  const entry = createMemo(() => {
    const example = registryBySlug.get(params().slug);
    if (example === undefined) throw notFound();
    return example;
  });
  const cat = createMemo(() => categories.find((c) => c.id === entry().category));
  const idx = createMemo(() => registry.findIndex((e) => e.slug === params().slug));
  const prev = createMemo(() => {
    const index = idx();
    return index > 0 ? registry[index - 1] : registry[registry.length - 1];
  });
  const next = createMemo(() => {
    const index = idx();
    return index < registry.length - 1 ? registry[index + 1] : registry[0];
  });
  const [source, setSource] = createSignal("");
  const [highlightedSource, setHighlightedSource] = createSignal<HighlightedTree | undefined>();

  onSettled(() => {
    const example = entry();
    void example.loadSource().then(setSource);
    void example.loadHighlightedSource().then(setHighlightedSource);
  });

  return (
    <div class="mx-auto max-w-[1280px] px-7 pt-8 pb-24">
      <div class="mb-5 flex gap-1.5 text-[0.8125rem] text-fg-dim">
        <Link to="/examples" class="hover:text-fg">
          Gallery
        </Link>
        <span>/</span>
        <span class="capitalize">{cat()?.label}</span>
        <span>/</span>
        <span class="text-fg">{entry().title}</span>
      </div>

      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 class="text-[clamp(1.75rem,4vw,2.5rem)] font-semibold tracking-[-0.025em]">
            {entry().title}
          </h1>
          <p class="mt-2 max-w-[60ch] leading-[1.5] text-fg-muted">{entry().description}</p>
        </div>
        <div class="flex gap-2">
          <Link
            to="/examples/$slug"
            params={{ slug: prev().slug }}
            class="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-sm text-fg-muted transition hover:border-border-strong hover:text-fg"
          >
            ← Previous
          </Link>
          <Link
            to="/examples/$slug"
            params={{ slug: next().slug }}
            class="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-sm text-fg-muted transition hover:border-border-strong hover:text-fg"
          >
            Next →
          </Link>
        </div>
      </div>

      <div class="mt-8 flex flex-col gap-6">
        <section class="stage-grad relative flex min-h-[420px] items-center justify-center overflow-hidden rounded-[28px] border border-border p-6 sm:p-10">
          <Show when={entry().tag}>
            <span class="absolute top-3 left-3 z-10 rounded-full border border-border bg-bg/80 px-2 py-0.5 font-mono text-[0.6875rem] text-fg-muted backdrop-blur">
              {entry().tag}
            </span>
          </Show>
          <div class="w-full max-w-[760px]">
            <Dynamic component={entry().Component} />
          </div>
        </section>

        <section class="flex flex-col overflow-hidden rounded-[28px] border border-border bg-card">
          <div class="flex items-center gap-2.5 border-b border-border px-4 py-3 font-mono text-xs text-fg-dim">
            <span class="flex gap-1.5">
              <span class="h-2.5 w-2.5 rounded-full bg-[#ff5f56]" />
              <span class="h-2.5 w-2.5 rounded-full bg-[#ffbd2e]" />
              <span class="h-2.5 w-2.5 rounded-full bg-[#27c93f]" />
            </span>
            <span class="ml-2">{entry().slug}.tsx</span>
            <span class="flex-1" />
            <CopyButton text={source() ?? ""} disabled={!source()} />
          </div>
          <Show
            when={highlightedSource()}
            fallback={<div class="px-4 py-6 font-mono text-xs text-fg-dim">Loading source...</div>}
          >
            {(tree) => (
              <div class="shiki-host scrollbar-thin">
                <HighlightedCode tree={tree()} />
              </div>
            )}
          </Show>
        </section>
      </div>
    </div>
  );
}

function CopyButton(props: { text: string; disabled?: boolean }) {
  const [copied, setCopied] = createSignal(false);
  let resetTimer: ReturnType<typeof setTimeout> | undefined;

  const handleCopy = async () => {
    if (props.disabled) return;
    try {
      await navigator.clipboard.writeText(props.text);
    } catch {
      return;
    }
    setCopied(true);
    if (resetTimer) clearTimeout(resetTimer);
    resetTimer = setTimeout(() => setCopied(false), 1600);
  };

  onCleanup(() => {
    if (resetTimer) clearTimeout(resetTimer);
  });

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={props.disabled}
      aria-label="Copy source"
      class="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 font-mono text-[0.6875rem] text-fg-muted transition hover:border-border-strong hover:text-fg disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Show
        when={copied()}
        fallback={
          <>
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <rect x="9" y="9" width="13" height="13" rx="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            <span>Copy</span>
          </>
        }
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <span>Copied</span>
      </Show>
    </button>
  );
}
