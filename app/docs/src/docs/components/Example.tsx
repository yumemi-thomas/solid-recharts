import { Link } from "@tanstack/solid-router";
import { Dynamic } from "@solidjs/web";
import { Show, createMemo, createSignal, onCleanup, onSettled } from "solid-js";
import { registryBySlug } from "~/examples/registry";
import type { HighlightedTree } from "~/docs/highlighter";
import { HighlightedCode } from "./HighlightedCode";

export function Example(props: { slug: string; showSource?: boolean }) {
  const entry = createMemo(() => registryBySlug.get(props.slug));
  const [source, setSource] = createSignal("");
  const [highlightedSource, setHighlightedSource] = createSignal<HighlightedTree | undefined>();

  onSettled(() => {
    const example = entry();
    if (example === undefined) return;
    void example.loadSource().then(setSource);
    void example.loadHighlightedSource().then(setHighlightedSource);
  });

  return (
    <Show
      when={entry()}
      fallback={
        <div class="rounded-2xl border border-border bg-card p-4 text-sm text-fg-muted">
          Missing example: <code class="font-mono text-accent">{props.slug}</code>
        </div>
      }
    >
      {(example) => (
        <figure class="not-prose my-6 flex flex-col gap-3">
          <section class="stage-grad relative flex min-h-[320px] items-center justify-center overflow-hidden rounded-[20px] border border-border p-6 sm:p-8">
            <Show when={example().tag}>
              <span class="absolute top-3 left-3 z-10 rounded-full border border-border bg-bg/80 px-2 py-0.5 font-mono text-[0.6875rem] text-fg-muted backdrop-blur">
                {example().tag}
              </span>
            </Show>
            <div class="w-full max-w-[640px]">
              <Dynamic component={example().Component} />
            </div>
          </section>
          <Show when={props.showSource !== false}>
            <section class="flex flex-col overflow-hidden rounded-[20px] border border-border bg-card">
              <div class="flex items-center gap-2.5 border-b border-border px-4 py-2.5 font-mono text-xs text-fg-dim">
                <span class="flex gap-1.5">
                  <span class="h-2 w-2 rounded-full bg-[#ff5f56]" />
                  <span class="h-2 w-2 rounded-full bg-[#ffbd2e]" />
                  <span class="h-2 w-2 rounded-full bg-[#27c93f]" />
                </span>
                <span class="ml-1.5">{example().slug}.tsx</span>
                <span class="flex-1" />
                <CopyButton text={source() ?? ""} disabled={!source()} />
                <Link
                  to="/examples/$slug"
                  params={{ slug: example().slug }}
                  viewTransition
                  class="rounded-md border border-border px-2 py-1 text-[0.6875rem] text-fg-muted transition hover:border-border-strong hover:text-fg"
                >
                  Open ↗
                </Link>
              </div>
              <Show
                when={highlightedSource()}
                fallback={
                  <div class="px-4 py-6 font-mono text-xs text-fg-dim">Loading source...</div>
                }
              >
                {(tree) => (
                  <div class="shiki-host scrollbar-thin max-h-[420px]">
                    <HighlightedCode tree={tree()} />
                  </div>
                )}
              </Show>
            </section>
          </Show>
        </figure>
      )}
    </Show>
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
      {copied() ? "Copied" : "Copy"}
    </button>
  );
}
