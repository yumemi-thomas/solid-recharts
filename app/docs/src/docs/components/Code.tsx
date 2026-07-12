// oxlint-disable solid/no-innerhtml
import { Show, createMemo, createSignal, onCleanup } from "solid-js";
import { highlight } from "../highlighter";

export function CodeBlock(props: { children: string; lang?: string; filename?: string }) {
  const html = createMemo(() => highlight(props.children.trim(), props.lang ?? "tsx"));
  return (
    <figure class="not-prose relative my-6 flex w-full flex-col overflow-hidden rounded-[18px] border border-border bg-card">
      <Show when={props.filename}>
        <div class="flex items-center gap-2 border-b border-border px-3.5 py-2 font-mono text-[0.6875rem] text-fg-dim">
          <span>{props.filename}</span>
          <span class="flex-1" />
          <CopyButton text={props.children.trim()} />
        </div>
      </Show>
      <div class="shiki-host scrollbar-thin" innerHTML={html()} />
      <Show when={!props.filename}>
        <span class="absolute right-2.5 top-2.5">
          <CopyButton text={props.children.trim()} />
        </span>
      </Show>
    </figure>
  );
}

function CopyButton(props: { text: string }) {
  const [copied, setCopied] = createSignal(false);
  let resetTimer: ReturnType<typeof setTimeout> | undefined;

  const handleCopy = async () => {
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
      aria-label="Copy code"
      class="inline-flex items-center gap-1.5 rounded-md border border-border bg-bg/40 px-2 py-1 font-mono text-[0.6875rem] text-fg-muted transition hover:border-border-strong hover:text-fg"
    >
      {copied() ? "Copied" : "Copy"}
    </button>
  );
}
