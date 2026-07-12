import { ResponsiveContainer, Treemap } from "solid-recharts";
import { treemapData } from "./data";

export const meta = {
  slug: "treemap-basic",
  title: "Basic treemap",
  category: "hierarchy",
  description: "A treemap of nested rectangles sized by each node's data.",
  tag: "Treemap",
} as const;

export default function TreemapBasic() {
  return (
    <div class="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <Treemap data={treemapData} dataKey="size" nameKey="name" />
      </ResponsiveContainer>
    </div>
  );
}
