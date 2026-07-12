import { Bar, BarChart, XAxis } from "solid-recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/shadcn/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "~/components/shadcn/chart";

export const meta = {
  slug: "shadcn-tooltip-formatter",
  title: "Tooltip - Formatter",
  category: "shadcn-tooltip",
  description: "Tooltip with custom formatter.",
  tag: "BarChart",
} as const;

const chartData = [
  { date: "2024-07-15", running: 450, swimming: 300 },
  { date: "2024-07-16", running: 380, swimming: 420 },
  { date: "2024-07-17", running: 520, swimming: 120 },
  { date: "2024-07-18", running: 140, swimming: 550 },
  { date: "2024-07-19", running: 600, swimming: 350 },
  { date: "2024-07-20", running: 480, swimming: 400 },
];

const chartConfig = {
  running: {
    label: "Running",
    color: "var(--chart-1)",
  },
  swimming: {
    label: "Swimming",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

// Widened view of chartConfig so the formatter can look up labels by a
// runtime string name without type assertions.
const chartLabels: ChartConfig = chartConfig;

export default function ShadcnTooltipFormatter() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tooltip - Formatter</CardTitle>
        <CardDescription>Tooltip with custom formatter.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart accessibilityLayer data={chartData}>
            <XAxis
              dataKey="date"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) =>
                new Date(String(value)).toLocaleDateString("en-US", {
                  weekday: "short",
                })
              }
            />
            <Bar dataKey="running" stackId="a" fill="var(--color-running)" radius={[0, 0, 4, 4]} />
            <Bar
              dataKey="swimming"
              stackId="a"
              fill="var(--color-swimming)"
              radius={[4, 4, 0, 0]}
            />
            <ChartTooltip
              content={(contentProps) => (
                <ChartTooltipContent
                  {...contentProps}
                  hideLabel
                  formatter={(value, name) => (
                    <div class="flex min-w-[130px] items-center text-xs text-muted-foreground">
                      {(typeof name === "string" ? chartLabels[name]?.label : undefined) ?? name}
                      <div class="ml-auto flex items-baseline gap-0.5 font-mono font-medium text-foreground tabular-nums">
                        {value}
                        <span class="font-normal text-muted-foreground">kcal</span>
                      </div>
                    </div>
                  )}
                />
              )}
              cursor={false}
              defaultIndex={1}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
