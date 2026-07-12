import {
  Legend,
  PolarAngleAxis,
  PolarRadiusAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
} from "solid-recharts";

const data = [
  {
    name: "Item A",
    value: 100,
    fill: "#8884d8",
  },
  {
    name: "Item B",
    value: 75,
    fill: "#82ca9d",
  },
  {
    name: "Item C",
    value: 120,
    fill: "#ffc658",
  },
  {
    name: "Item D",
    value: 90,
    fill: "#ff7c7c",
  },
];

export const meta = {
  slug: "radial-bar-basic",
  title: "Basic radial bar chart",
  category: "radial",
  description: "Radial bars with per-entry fill colors and legend.",
  tag: "RadialBarChart",
} as const;

export default function RadialBarBasic() {
  return (
    <div class="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <PolarAngleAxis dataKey="name" />
          <PolarRadiusAxis />
          <RadialBar dataKey="value" />
          <Tooltip />
          <Legend />
        </RadialBarChart>
      </ResponsiveContainer>
    </div>
  );
}
