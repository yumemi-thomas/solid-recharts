import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "solid-recharts";
import { pageStats } from "./data";

export const meta = {
  slug: "bar-labels",
  title: "Bar chart with labels",
  category: "bar",
  description: "Bars with value labels displayed above each bar using LabelList.",
  tag: "LabelList",
} as const;

export default function BarLabels() {
  return (
    <div class="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={pageStats} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="pv" fill="#8884d8" radius={[4, 4, 0, 0]}>
            <LabelList dataKey="pv" position="top" />
          </Bar>
          <Bar dataKey="uv" fill="#82ca9d" radius={[4, 4, 0, 0]}>
            <LabelList dataKey="uv" position="top" />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
