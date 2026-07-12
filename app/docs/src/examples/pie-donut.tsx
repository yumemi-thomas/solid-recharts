import { For } from "solid-js";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "solid-recharts";
import { browserShare, PIE_COLORS } from "./data";

export const meta = {
  slug: "pie-donut",
  title: "Donut chart",
  category: "pie",
  description: "A pie with inner radius and a `Cell` per slice for custom colors.",
  tag: "PieChart",
} as const;

export default function PieDonut() {
  return (
    <div class="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={browserShare}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={2}
          >
            <For each={browserShare}>
              {(_, i) => <Cell fill={PIE_COLORS[i() % PIE_COLORS.length]} />}
            </For>
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
