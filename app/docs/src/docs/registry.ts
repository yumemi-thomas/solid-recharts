import { groupOrder, type DocEntry, type DocModule } from "./types";

const modules = import.meta.glob<DocModule>("./api/*.mdx", { eager: true });

export const docs: DocEntry[] = Object.values(modules)
  .map((mod): DocEntry | null => {
    if (!mod.meta) return null;
    return { ...mod.meta, Component: mod.default };
  })
  .filter((x): x is DocEntry => x !== null)
  .sort((a, b) => {
    const ga = groupOrder.indexOf(a.group);
    const gb = groupOrder.indexOf(b.group);
    if (ga !== gb) return ga - gb;
    if (a.order !== undefined || b.order !== undefined) {
      return (a.order ?? 1e6) - (b.order ?? 1e6);
    }
    return a.title < b.title ? -1 : a.title > b.title ? 1 : 0;
  });

export const docsBySlug = new Map(docs.map((d) => [d.slug, d]));

export const docsByGroup = (() => {
  const map = new Map<string, DocEntry[]>();
  for (const g of groupOrder) map.set(g, []);
  for (const d of docs) map.get(d.group)?.push(d);
  return map;
})();
