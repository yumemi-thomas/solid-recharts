import {
  Bar,
  BarChart,
  ErrorBar,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "solid-recharts";

export const meta = {
  slug: "error-bars",
  title: "Error bars",
  category: "reference",
  description: "Bar chart with ErrorBar whiskers showing data uncertainty.",
  tag: "ErrorBar",
} as const;

const data = [
  { name: "A", value: 4000, error: 400 },
  { name: "B", value: 3000, error: 300 },
  { name: "C", value: 2000, error: 200 },
  { name: "D", value: 2780, error: 280 },
  { name: "E", value: 1890, error: 190 },
];

export default function ErrorBars() {
  return (
    <div class="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="value" fill="#8884d8">
            <ErrorBar dataKey="error" width={5} stroke="#ff7300" />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
