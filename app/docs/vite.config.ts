import path from "node:path";
// Import from real `vite` (this standalone workspace's actual dependency) —
// NOT "vite-plus": that only resolved locally by escaping up into the
// monorepo root's node_modules, and breaks isolated CI installs (Vercel).
import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/solid-start/plugin/vite";
import { nitro } from "nitro/vite";
import viteSolid from "vite-plugin-solid";
import tailwindcss from "@tailwindcss/vite";
import mdx from "@mdx-js/rollup";
import rehypeShiki from "@shikijs/rehype";
import remarkGfm from "remark-gfm";

// Alias `solid-recharts` to the local package source so vite-plugin-solid
// transforms the source-shipped JSX and the docs app stays in lockstep.
const libSrc = path.resolve(import.meta.dirname, "../../packages/solid-recharts/src");

export default defineConfig({
  server: {
    port: 3000,
  },
  resolve: {
    dedupe: ["solid-js", "@solidjs/web", "@solidjs/signals"],
    alias: {
      "solid-recharts": path.join(libSrc, "index.ts"),
      "solid-js/web": "@solidjs/web",
      "~/mdx-runtime/jsx-runtime": path.resolve(
        import.meta.dirname,
        "src/mdx-runtime/jsx-runtime.ts",
      ),
      "~": path.resolve(import.meta.dirname, "src"),
    },
  },
  optimizeDeps: {
    exclude: ["solid-recharts"],
  },
  ssr: {
    noExternal: ["solid-recharts"],
  },
  plugins: [
    tailwindcss(),
    // MDX is compiled to Solid-compatible JSX. Custom components are passed
    // through the generated component's `components` prop at render time.
    {
      enforce: "pre",
      ...mdx({
        jsxImportSource: "~/mdx-runtime",
        remarkPlugins: [remarkGfm],
        rehypePlugins: [
          [
            rehypeShiki,
            {
              theme: "github-light",
              defaultLanguage: "tsx",
              fallbackLanguage: "tsx",
            },
          ],
        ],
      }),
    },
    tanstackStart(),
    nitro(),
    viteSolid({ ssr: true, hot: false }),
  ],
});
