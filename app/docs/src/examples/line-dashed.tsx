import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "solid-recharts";
import { pageStats } from "./data";

export const meta = {
  slug: "line-dashed",
  title: "Line with dashed stroke",
  category: "line",
  description: "A line chart with solid and dashed lines, and custom dot styling.",
  tag: "Line",
} as const;

export default function LineDashed() {
  return (
    <div class="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={pageStats} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="pv" stroke="#8884d8" dot={{ r: 4 }} activeDot={{ r: 6 }} />
          <Line type="monotone" dataKey="uv" stroke="#82ca9d" strokeDasharray="5 5" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
