import { Show } from "solid-js";
import { CartesianGrid, Line, LineChart, XAxis } from "solid-recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/shadcn/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "~/components/shadcn/chart";
import { TrendingUp } from "~/components/shadcn/icons";

export const meta = {
  slug: "shadcn-line-dots-custom",
  title: "Line Chart - Custom Dots",
  category: "shadcn-line",
  description: "A line chart with custom dots",
  tag: "LineChart",
} as const;

const chartData = [
  { month: "January", desktop: 186, mobile: 80 },
  { month: "February", desktop: 305, mobile: 200 },
  { month: "March", desktop: 237, mobile: 120 },
  { month: "April", desktop: 73, mobile: 190 },
  { month: "May", desktop: 209, mobile: 130 },
  { month: "June", desktop: 214, mobile: 140 },
];

const chartConfig = {
  desktop: {
    label: "Desktop",
    color: "var(--chart-1)",
  },
  mobile: {
    label: "Mobile",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

export default function ShadcnLineDotsCustom() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Line Chart - Custom Dots</CardTitle>
        <CardDescription>January - June 2024</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <LineChart
            accessibilityLayer
            data={chartData}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => String(value).slice(0, 3)}
            />
            <ChartTooltip
              cursor={false}
              content={(contentProps) => <ChartTooltipContent {...contentProps} hideLabel />}
            />
            <Line
              dataKey="desktop"
              type="natural"
              stroke="var(--color-desktop)"
              strokeWidth={2}
              // Deviation: the local GitCommitVertical icon takes no position/size
              // props, so the lucide git-commit-vertical paths are inlined in a
              // positioned nested <svg>.
              dot={(dotProps) => {
                const r = 24;
                return (
                  <Show when={dotProps.cx != null && dotProps.cy != null}>
                    <svg
                      x={(dotProps.cx ?? 0) - r / 2}
                      y={(dotProps.cy ?? 0) - r / 2}
                      width={r}
                      height={r}
                      viewBox="0 0 24 24"
                      fill="hsl(var(--background))"
                      stroke="var(--color-desktop)"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <path d="M12 3v6" />
                      <circle cx="12" cy="12" r="3" />
                      <path d="M12 15v6" />
                    </svg>
                  </Show>
                );
              }}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
      <CardFooter class="flex-col items-start gap-2 text-sm">
        <div class="flex gap-2 leading-none font-medium">
          Trending up by 5.2% this month <TrendingUp class="h-4 w-4" />
        </div>
        <div class="leading-none text-muted-foreground">
          Showing total visitors for the last 6 months
        </div>
      </CardFooter>
    </Card>
  );
}
