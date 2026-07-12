import { Link } from "@tanstack/solid-router";
import { createMemo } from "solid-js";

export function ErrorView(props: { error: unknown; reset?: () => void }) {
  const message = createMemo(() => {
    const e = props.error;
    if (!e) return "Unknown error";
    if (typeof e === "string") return e;
    if (typeof e === "object" && "message" in e && typeof e.message === "string") {
      return e.message;
    }
    return "Unknown error";
  });

  const stack = createMemo(() => {
    const e = props.error;
    if (typeof e === "object" && e !== null && "stack" in e && typeof e.stack === "string") {
      return e.stack;
    }
    return "";
  });

  const name = createMemo(() => {
    const e = props.error;
    if (typeof e === "object" && e !== null && "name" in e && typeof e.name === "string") {
      return e.name;
    }
    return "Error";
  });

  return (
    <div class="mx-auto max-w-[960px] px-7 py-12">
      <div class="overflow-hidden rounded-[28px] border border-border bg-card">
        <div class="flex items-center gap-3 border-b border-border bg-[#1a1015] px-5 py-3">
          <span class="grid h-7 w-7 place-items-center rounded-full bg-[#ff4d8d]/15 text-[#ff7aa5]">
            !
          </span>
          <div class="flex-1">
            <div class="text-sm font-semibold text-[#ff7aa5]">{name()}</div>
            <div class="text-xs text-fg-dim">
              A render or hydration error bubbled up to the root route.
            </div>
          </div>
          <Link
            to="/"
            class="rounded-full border border-border bg-card px-3 py-1 text-xs text-fg-muted hover:text-fg"
          >
            ← Gallery
          </Link>
          {props.reset ? (
            <button
              onClick={() => props.reset?.()}
              class="rounded-full bg-fg px-3 py-1 text-xs font-semibold text-bg"
            >
              Retry
            </button>
          ) : null}
        </div>

        <div class="px-5 py-4">
          <h2 class="text-lg font-semibold tracking-tight">{message()}</h2>
        </div>

        <pre class="scrollbar-thin max-h-[60vh] overflow-auto border-t border-border bg-[#0b0b12] px-5 py-4 font-mono text-[0.78125rem] leading-[1.6] whitespace-pre text-[#d4d4f5]">
          {stack() || "(no stack)"}
        </pre>
      </div>
    </div>
  );
}
