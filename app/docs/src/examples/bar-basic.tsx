import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "solid-recharts";
import { pageStats } from "./data";

export const meta = {
  slug: "bar-basic",
  title: "Grouped bar chart",
  category: "bar",
  description: "Two side-by-side bar series with rounded tops and a hover cursor.",
  tag: "BarChart",
} as const;

export default function BarBasic() {
  return (
    <div class="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={pageStats} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="pv" fill="#8884d8" radius={[4, 4, 0, 0]} />
          <Bar dataKey="uv" fill="#82ca9d" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
