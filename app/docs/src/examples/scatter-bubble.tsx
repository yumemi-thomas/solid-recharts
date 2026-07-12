import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "solid-recharts";
import { scatterPoints } from "./data";

export const meta = {
  slug: "scatter-bubble",
  title: "Bubble chart",
  category: "scatter",
  description: "Scatter plot with bubble sizes driven by a ZAxis range.",
  tag: "ScatterChart",
} as const;

export default function ScatterBubble() {
  return (
    <div class="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="x" type="number" />
          <YAxis dataKey="y" type="number" />
          <ZAxis dataKey="z" range={[100, 1000]} />
          <Tooltip />
          <Scatter name="Points" data={scatterPoints} fill="#8884d8" />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
