import {
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "solid-recharts";
import { skillData } from "./data";

export const meta = {
  slug: "radar-basic",
  title: "Basic radar chart",
  category: "radial",
  description: "Two radar series overlaid on a polar grid with angle and radius axes.",
  tag: "RadarChart",
} as const;

export default function RadarBasic() {
  return (
    <div class="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={skillData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <PolarGrid strokeDasharray="3 3" />
          <PolarAngleAxis dataKey="subject" />
          <PolarRadiusAxis />
          <Radar name="Series A" dataKey="a" stroke="#8884d8" fill="#8884d8" fillOpacity={0.5} />
          <Radar name="Series B" dataKey="b" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.5} />
          <Tooltip />
          <Legend />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
