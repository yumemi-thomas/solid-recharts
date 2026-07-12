import {
  BarChart,
  Bar,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "solid-recharts";
import { monthlySales } from "./data";

export const meta = {
  slug: "axes-custom-ticks",
  title: "Custom tick formatting",
  category: "axes",
  description: "BarChart with custom tickFormatter on both axes.",
  tag: "XAxis",
} as const;

export default function AxesCustomTicks() {
  const yFormatter = (value: unknown) => `${(Number(value) / 1000).toFixed(0)}k`;

  return (
    <div class="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={monthlySales} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis tickFormatter={yFormatter} />
          <Tooltip />
          <Legend />
          <Bar dataKey="online" fill="#8884d8" />
          <Bar dataKey="retail" fill="#82ca9d" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
