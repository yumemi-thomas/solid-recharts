import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ReferenceArea,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "solid-recharts";
import { pageStats } from "./data";

export const meta = {
  slug: "reference-lines",
  title: "Reference elements",
  category: "reference",
  description: "ReferenceLine, ReferenceArea, and ReferenceDot on a line chart.",
  tag: "ReferenceLine",
} as const;

export default function ReferenceLines() {
  return (
    <div class="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={pageStats} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="uv" stroke="#8884d8" />
          <ReferenceArea y1={2000} y2={4000} fill="#ccc" fillOpacity={0.3} />
          <ReferenceLine y={3000} stroke="#ff7300" strokeDasharray="5 5" label="Threshold" />
          <ReferenceDot x="Page C" y={2000} r={5} fill="#ff7300" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
