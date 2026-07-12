import { For } from "solid-js";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "solid-recharts";
import { browserShare, PIE_COLORS } from "./data";

export const meta = {
  slug: "pie-labels",
  title: "Pie with labels",
  category: "pie",
  description: "A pie chart with label rendering and Cell colors per slice.",
  tag: "Pie",
} as const;

export default function PieLabels() {
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
            outerRadius={80}
            label
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
