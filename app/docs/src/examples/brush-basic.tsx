import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Brush,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "solid-recharts";
import { monthlySales } from "./data";

export const meta = {
  slug: "brush-basic",
  title: "Brush",
  category: "interaction",
  description: "LineChart with a draggable Brush to pan the data window.",
  tag: "Brush",
} as const;

export default function BrushBasic() {
  return (
    <div class="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={monthlySales} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="online" stroke="#8884d8" />
          <Line type="monotone" dataKey="retail" stroke="#82ca9d" />
          <Brush dataKey="month" height={30} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
