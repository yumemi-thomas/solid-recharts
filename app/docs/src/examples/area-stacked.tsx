import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "solid-recharts";
import { monthlySales } from "./data";

export const meta = {
  slug: "area-stacked",
  title: "Stacked area chart",
  category: "area",
  description: "Two series stacked with `stackId`, filled with translucent brand colors.",
  tag: "AreaChart",
} as const;

export default function AreaStacked() {
  return (
    <div class="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={monthlySales} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip />
          <Area
            type="monotone"
            dataKey="retail"
            stackId="1"
            stroke="#8884d8"
            fill="#8884d8"
            fillOpacity={0.7}
          />
          <Area
            type="monotone"
            dataKey="online"
            stackId="1"
            stroke="#82ca9d"
            fill="#82ca9d"
            fillOpacity={0.7}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
