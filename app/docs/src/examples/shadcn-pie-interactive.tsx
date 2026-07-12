import { createMemo, createSignal } from "solid-js";
import { Label, Pie, PieChart, Sector, type PieSectorShapeProps } from "solid-recharts";
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
import { Select } from "~/components/shadcn/select";

export const meta = {
  slug: "shadcn-pie-interactive",
  title: "Pie Chart - Interactive",
  category: "shadcn-pie",
  description: "An interactive pie chart.",
  tag: "PieChart",
} as const;

const desktopData = [
  { month: "january", desktop: 186, fill: "var(--color-january)" },
  { month: "february", desktop: 305, fill: "var(--color-february)" },
  { month: "march", desktop: 237, fill: "var(--color-march)" },
  { month: "april", desktop: 173, fill: "var(--color-april)" },
  { month: "may", desktop: 209, fill: "var(--color-may)" },
];

const chartConfig = {
  visitors: {
    label: "Visitors",
  },
  desktop: {
    label: "Desktop",
  },
  mobile: {
    label: "Mobile",
  },
  january: {
    label: "January",
    color: "var(--chart-1)",
  },
  february: {
    label: "February",
    color: "var(--chart-2)",
  },
  march: {
    label: "March",
    color: "var(--chart-3)",
  },
  april: {
    label: "April",
    color: "var(--chart-4)",
  },
  may: {
    label: "May",
    color: "var(--chart-5)",
  },
} satisfies ChartConfig;

// Widened view of the config for string-keyed label lookups (no `as` assertions).
const configLabels: Record<string, { label?: string }> = chartConfig;

export default function ShadcnPieInteractive() {
  const id = "pie-interactive";
  const [activeMonth, setActiveMonth] = createSignal(desktopData[0].month);

  const activeIndex = createMemo(() =>
    desktopData.findIndex((item) => item.month === activeMonth()),
  );
  const months = desktopData.map((item) => item.month);
  const activeDesktop = (): number => desktopData[activeIndex()]?.desktop ?? 0;

  return (
    <Card class="flex flex-col">
      <CardHeader class="flex-row items-start space-y-0 pb-0">
        <div class="grid gap-1">
          <CardTitle>Pie Chart - Interactive</CardTitle>
          <CardDescription>January - June 2024</CardDescription>
        </div>
        {/* Deviation: the Radix Select (with per-month color swatches) is replaced
            by the local native Select; ChartStyle/data-chart on the Card are dropped
            because ChartContainer already provides them. */}
        <Select
          value={activeMonth()}
          onChange={setActiveMonth}
          options={months.map((key) => ({
            value: key,
            label: configLabels[key]?.label ?? key,
          }))}
          class="ml-auto h-7 w-[130px] rounded-lg pl-2.5"
          aria-label="Select a value"
        />
      </CardHeader>
      <CardContent class="flex flex-1 justify-center pb-0">
        <ChartContainer
          id={id}
          config={chartConfig}
          class="mx-auto aspect-square w-full max-w-[300px]"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={(contentProps) => <ChartTooltipContent {...contentProps} hideLabel />}
            />
            <Pie
              data={desktopData}
              dataKey="desktop"
              nameKey="month"
              innerRadius={60}
              strokeWidth={5}
              shape={(sectorProps: PieSectorShapeProps) =>
                sectorProps.index === activeIndex() ? (
                  <g>
                    <Sector {...sectorProps} outerRadius={sectorProps.outerRadius + 10} />
                    <Sector
                      {...sectorProps}
                      outerRadius={sectorProps.outerRadius + 25}
                      innerRadius={sectorProps.outerRadius + 12}
                    />
                  </g>
                ) : (
                  <Sector {...sectorProps} />
                )
              }
            >
              <Label
                content={(labelProps) => {
                  const vb = labelProps.viewBox;
                  if (vb && "cx" in vb && typeof vb.cx === "number" && typeof vb.cy === "number") {
                    return (
                      <text x={vb.cx} y={vb.cy} text-anchor="middle" dominant-baseline="middle">
                        <tspan x={vb.cx} y={vb.cy} class="fill-foreground text-3xl font-bold">
                          {activeDesktop().toLocaleString()}
                        </tspan>
                        <tspan x={vb.cx} y={vb.cy + 24} class="fill-muted-foreground">
                          Visitors
                        </tspan>
                      </text>
                    );
                  }
                  return null;
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
