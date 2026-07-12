import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "solid-recharts";
import { pageStats } from "./data";

export const meta = {
  slug: "composed-basic",
  title: "Composed chart",
  category: "composed",
  description: "Area, Bar and Line series combined in a single chart.",
  tag: "ComposedChart",
} as const;

export default function ComposedBasic() {
  return (
    <div class="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={pageStats} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="amt" fill="#8884d8" />
          <Area type="monotone" dataKey="uv" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.3} />
          <Line type="monotone" dataKey="pv" stroke="#ffc658" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
