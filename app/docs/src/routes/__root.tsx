/// <reference types="vite/client" />
import { HeadContent, Scripts, createRootRoute } from "@tanstack/solid-router";
import "~/styles/app.css";
import { ErrorView } from "~/components/ErrorView";
import { NotFoundView } from "~/components/NotFoundView";
import { TopNav } from "~/components/TopNav";
import type { JSX } from "@solidjs/web";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charset: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      { title: "Solid Recharts — Docs" },
      {
        name: "description",
        content:
          "Recharts for SolidJS 2.0. Composable chart components — line, area, bar, pie, radar, treemap, sankey and more — with live examples.",
      },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: "" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Geist:wght@300..700&family=Geist+Mono:wght@400;500;700&display=swap",
      },
    ],
  }),
  shellComponent: RootDocument,
  errorComponent: ErrorView,
  notFoundComponent: NotFoundView,
});

/* The route children MUST be rendered through a component, not as a bare
   {props.children} hole in RootDocument's template. Solid 2.0 SSR evaluates
   sibling components (<TopNav/>, <Scripts/>) eagerly while template expression
   holes resolve afterwards, but the client allocates hydration ids in document
   order. A bare hole inside <main> therefore gets its owner id AFTER Scripts'
   five owners on the server and BEFORE them on the client, shifting every
   route-subtree hydration key ("unclaimed server-rendered nodes" everywhere +
   fatal Hydration Mismatch on /docs/$slug). Wrapping the hole in a component
   makes the server resolve it eagerly at this source position, so both sides
   allocate TopNav → route content → Scripts. */
function Main(props: { children: JSX.Element }) {
  return <main class="flex-1">{props.children}</main>;
}

function RootDocument(props: { children: JSX.Element }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <div class="flex min-h-screen flex-col">
          <TopNav />
          <Main>{props.children}</Main>
          <footer class="border-t border-border px-4 py-8 text-center text-sm text-fg-muted sm:px-7">
            <div class="mx-auto max-w-[1320px] flex flex-col items-center gap-1.5 sm:flex-row sm:justify-between">
              <span>
                Built with{" "}
                <a
                  href="https://github.com/recharts/recharts"
                  target="_blank"
                  rel="noreferrer"
                  class="text-accent-2 underline decoration-border decoration-1 underline-offset-2 hover:decoration-accent-2"
                >
                  recharts
                </a>{" "}
                ·{" "}
                <a
                  href="https://tanstack.com/start"
                  target="_blank"
                  rel="noreferrer"
                  class="text-accent-2 underline decoration-border decoration-1 underline-offset-2 hover:decoration-accent-2"
                >
                  TanStack Start
                </a>{" "}
                ·{" "}
                <a
                  href="https://www.solidjs.com/"
                  target="_blank"
                  rel="noreferrer"
                  class="text-accent-2 underline decoration-border decoration-1 underline-offset-2 hover:decoration-accent-2"
                >
                  SolidJS
                </a>
              </span>
              <span class="font-mono text-xs text-fg-dim">MIT · 2026</span>
            </div>
          </footer>
        </div>
        <Scripts />
      </body>
    </html>
  );
}
