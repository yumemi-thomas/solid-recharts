import { Funnel, FunnelChart, ResponsiveContainer, Tooltip } from "solid-recharts";
import { funnelSteps } from "./data";

export const meta = {
  slug: "funnel-basic",
  title: "Basic funnel chart",
  category: "funnel",
  description: "A funnel with value-based trapezoid heights and tooltip on hover.",
  tag: "FunnelChart",
} as const;

export default function FunnelBasic() {
  return (
    <div class="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <FunnelChart>
          <Tooltip />
          <Funnel dataKey="value" data={funnelSteps} />
        </FunnelChart>
      </ResponsiveContainer>
    </div>
  );
}
