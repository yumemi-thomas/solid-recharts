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
  slug: "area-gradient",
  title: "Gradient fill area",
  category: "area",
  description: "Area with a custom linear gradient fill defined in an SVG defs.",
  tag: "AreaChart",
} as const;

export default function AreaGradient() {
  return (
    <div class="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={monthlySales} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorOnline" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stop-color="#8884d8" stop-opacity={0.8} />
              <stop offset="95%" stop-color="#8884d8" stop-opacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip />
          <Area type="monotone" dataKey="online" stroke="#8884d8" fill="url(#colorOnline)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
