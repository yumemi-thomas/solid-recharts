import { Outlet, createFileRoute, useRouterState } from "@tanstack/solid-router";
import { Show, createMemo, createSignal } from "solid-js";
import { DocsSidebar } from "~/components/DocsSidebar";

export const Route = createFileRoute("/docs")({
  component: DocsLayout,
});

function DocsLayout() {
  const state = useRouterState();
  const pathname = createMemo(() => state().location.pathname);
  const currentSlug = createMemo(() => {
    const m = pathname().match(/^\/docs\/([^/]+)/);
    return m ? m[1] : undefined;
  });

  const [drawerOpen, setDrawerOpen] = createSignal(false);

  return (
    <div class="mx-auto flex max-w-[1440px] flex-col lg:flex-row">
      <button
        type="button"
        class="lg:hidden flex items-center gap-2 border-b border-border bg-bg/60 px-4 py-2.5 text-sm text-fg-muted backdrop-blur"
        onClick={() => setDrawerOpen(true)}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.2"
          stroke-linecap="round"
        >
          <path d="M4 7h16" />
          <path d="M4 12h16" />
          <path d="M4 17h16" />
        </svg>
        Browse APIs
      </button>

      <aside class="hidden lg:block lg:w-[260px] lg:shrink-0 lg:border-r lg:border-border">
        <div class="sticky top-[64px] max-h-[calc(100vh-64px)] overflow-auto">
          <DocsSidebar currentSlug={currentSlug()} />
        </div>
      </aside>

      <Show when={drawerOpen()}>
        <div
          class="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setDrawerOpen(false)}
        />
        <div
          class="lg:hidden fixed left-0 top-0 bottom-0 z-50 w-[80vw] max-w-[320px] overflow-auto border-r border-border bg-bg shadow-2xl"
          onClick={(e) => {
            // Close after navigation: anchor clicks bubble here.
            const target = e.target;
            if (target instanceof HTMLElement && target.closest("a")) setDrawerOpen(false);
          }}
        >
          <div class="flex items-center justify-between border-b border-border px-3 py-2.5">
            <span class="text-sm font-semibold tracking-tight">APIs</span>
            <button
              type="button"
              class="rounded-full border border-border bg-card px-2 py-1 text-[0.6875rem] text-fg-muted"
              onClick={() => setDrawerOpen(false)}
            >
              Close
            </button>
          </div>
          <DocsSidebar currentSlug={currentSlug()} />
        </div>
      </Show>

      <main class="min-w-0 flex-1">
        <Outlet />
      </main>
    </div>
  );
}
