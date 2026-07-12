import { ResponsiveContainer, Sankey, Tooltip } from "solid-recharts";
import { sankeyData } from "./data";

export const meta = {
  slug: "sankey-basic",
  title: "Basic sankey",
  category: "hierarchy",
  description: "A flow diagram with weighted links between nodes.",
  tag: "Sankey",
} as const;

export default function SankeyBasic() {
  return (
    <div class="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <Sankey data={sankeyData}>
          <Tooltip />
        </Sankey>
      </ResponsiveContainer>
    </div>
  );
}
