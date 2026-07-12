import { createHighlighter } from "shiki";

// Top-level await is fine: this module runs once per server/client boot.
const highlighter = await createHighlighter({
  themes: ["github-light"],
  langs: ["tsx", "ts", "jsx", "js", "bash", "json", "html", "css"],
});

const supported = new Set(highlighter.getLoadedLanguages());

export function highlight(source: string, lang = "tsx") {
  const language = supported.has(lang) ? lang : "tsx";
  return highlighter.codeToHtml(source, {
    lang: language,
    theme: "github-light",
  });
}
