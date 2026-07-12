import { ResponsiveContainer, SunburstChart } from "solid-recharts";
import { sunburstData } from "./data";

export const meta = {
  slug: "sunburst-basic",
  title: "Basic sunburst chart",
  category: "hierarchy",
  description: "A radial hierarchical chart with nested rings of sectors.",
  tag: "SunburstChart",
} as const;

export default function SunburstBasic() {
  return (
    <div class="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <SunburstChart data={sunburstData} />
      </ResponsiveContainer>
    </div>
  );
}
