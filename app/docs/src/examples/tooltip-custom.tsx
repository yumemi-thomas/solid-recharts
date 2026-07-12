import { For, Show } from "solid-js";
import type { TooltipContentProps } from "solid-recharts";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "solid-recharts";
import { monthlySales } from "./data";

export const meta = {
  slug: "tooltip-custom",
  title: "Custom tooltip",
  category: "tooltip-legend",
  description: "A bar chart with a styled custom tooltip showing all series values.",
  tag: "Tooltip",
} as const;

function CustomTooltip(props: TooltipContentProps) {
  return (
    <div
      style={{
        "background-color": "white",
        padding: "8px 12px",
        border: "1px solid #ccc",
        "border-radius": "4px",
        "box-shadow": "0 2px 8px rgba(0, 0, 0, 0.15)",
      }}
    >
      <Show when={props.active && props.payload && props.payload.length > 0}>
        <div>
          <p style={{ margin: "0 0 8px 0", "font-weight": "bold", "font-size": "14px" }}>
            {props.label}
          </p>
          <For each={props.payload}>
            {(entry) => (
              <div
                style={{
                  color: entry.fill || "#000",
                  margin: "4px 0",
                  "font-size": "13px",
                }}
              >
                <span style={{ "margin-right": "8px" }}>{entry.name}:</span>
                <span style={{ "font-weight": "500" }}>${entry.value}</span>
              </div>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}

export default function TooltipCustom() {
  return (
    <div class="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={monthlySales}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip content={CustomTooltip} />
          <Legend />
          <Bar dataKey="online" fill="#8884d8" name="Online" />
          <Bar dataKey="retail" fill="#82ca9d" name="Retail" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
