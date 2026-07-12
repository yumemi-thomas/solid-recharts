import { Link } from "@tanstack/solid-router";

export function NotFoundView() {
  return (
    <div class="mx-auto max-w-[640px] px-7 py-24 text-center">
      <h1 class="text-3xl font-semibold tracking-tight">Page not found</h1>
      <p class="mt-2 text-fg-muted">That route isn’t in these docs. Head back and pick a chart.</p>
      <Link
        to="/"
        class="mt-6 inline-flex rounded-full bg-fg px-5 py-2 text-sm font-semibold text-bg"
      >
        ← Home
      </Link>
    </div>
  );
}
