import {
  PolarAngleAxis,
  PolarRadiusAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "solid-recharts";
import { skillData } from "./data";

export const meta = {
  slug: "polar-custom-axes",
  title: "Custom polar axes",
  category: "radial",
  description: "RadarChart with explicit PolarAngleAxis and PolarRadiusAxis configuration.",
  tag: "RadarChart",
} as const;

export default function PolarCustomAxes() {
  return (
    <div class="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={skillData}>
          <PolarGrid />
          <PolarAngleAxis dataKey="subject" />
          <PolarRadiusAxis angle={30} domain={[0, 150]} />
          <Radar dataKey="a" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
