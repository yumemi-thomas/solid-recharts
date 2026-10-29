import { createHighlighter } from "shiki";

// Top-level await is fine: this module runs once per server/client boot.
const highlighter = await createHighlighter({
  themes: ["github-light"],
  langs: ["tsx", "ts", "jsx", "js", "bash", "json", "html", "css"],
});

const supported = new Set(highlighter.getLoadedLanguages());

/** shiki's syntax tree: render it with `<HighlightedCode>`. */
export type HighlightedTree = ReturnType<typeof highlighter.codeToHast>;
export type HighlightedNode = HighlightedTree["children"][number];

export function highlight(source: string, lang = "tsx"): HighlightedTree {
  const language = supported.has(lang) ? lang : "tsx";
  return highlighter.codeToHast(source, {
    lang: language,
    theme: "github-light",
  });
}
