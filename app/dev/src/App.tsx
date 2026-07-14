import { createSignal, For, Show } from "solid-js";
import type { JSX } from "solid-js";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Brush,
  CartesianGrid,
  Funnel,
  FunnelChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  RadialBar,
  RadialBarChart,
  Sankey,
  Scatter,
  ScatterChart,
  Surface,
  SunburstChart,
  Dot,
  Tooltip,
  Treemap,
  XAxis,
  YAxis,
} from "solid-recharts";

// Dev harness + Playwright a11y/geometry gallery. `?chart=<key>` renders one chart
// with recharts default colors on a white background so a real-browser axe pass
// (e2e/) can validate color-contrast + real layout geometry. No param → landing.
const data = [
  { name: "Page A", uv: 4000, pv: 2400, value: 4000 },
  { name: "Page B", uv: 3000, pv: 1398, value: 3000 },
  { name: "Page C", uv: 2000, pv: 9800, value: 2000 },
  { name: "Page D", uv: 2780, pv: 3908, value: 2780 },
  { name: "Page E", uv: 1890, pv: 4800, value: 1890 },
];

const sankeyData = {
  nodes: [{ name: "A" }, { name: "B" }, { name: "C" }],
  links: [
    { source: 0, target: 1, value: 10 },
    { source: 1, target: 2, value: 5 },
  ],
};

const treemapData = [
  {
    name: "A",
    value: 100,
    children: [
      { name: "A1", value: 60 },
      { name: "A2", value: 40 },
    ],
  },
  { name: "B", value: 80 },
];

const sunburstData = {
  name: "root",
  children: [
    { name: "A", value: 40, fill: "#8884d8" },
    { name: "B", value: 30, fill: "#83a6ed" },
  ],
};

const combined = () => (
  <BarChart
    width={500}
    height={320}
    data={data}
    margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
  >
    <CartesianGrid stroke="#f5f5f5" />
    <XAxis dataKey="name" />
    <YAxis />
    <Tooltip />
    <Legend />
    <Bar dataKey="uv" fill="#8884d8" name="UV" />
    <Bar dataKey="pv" fill="#82ca9d" name="PV" />
    <Brush dataKey="name" height={30} />
  </BarChart>
);

const charts: Record<string, () => JSX.Element> = {
  bar: () => (
    <BarChart width={400} height={300} data={data}>
      <XAxis dataKey="name" />
      <YAxis />
      <Legend />
      <Bar dataKey="uv" fill="#8884d8" name="UV" />
    </BarChart>
  ),
  line: () => (
    <LineChart width={400} height={300} data={data}>
      <XAxis dataKey="name" />
      <YAxis />
      <Legend />
      <Line type="monotone" dataKey="uv" stroke="#8884d8" name="UV" />
    </LineChart>
  ),
  area: () => (
    <AreaChart width={400} height={300} data={data}>
      <XAxis dataKey="name" />
      <YAxis />
      <Legend />
      <Area type="monotone" dataKey="uv" stroke="#8884d8" fill="#8884d8" name="UV" />
    </AreaChart>
  ),
  pie: () => (
    <PieChart width={400} height={300}>
      <Legend />
      <Tooltip />
      <Pie
        data={data}
        dataKey="value"
        nameKey="name"
        cx="50%"
        cy="50%"
        outerRadius={80}
        fill="#8884d8"
      />
    </PieChart>
  ),
  scatter: () => (
    <ScatterChart width={400} height={300}>
      <XAxis dataKey="uv" name="uv" />
      <YAxis dataKey="pv" name="pv" />
      <Legend />
      <Scatter name="A" data={data} fill="#8884d8" />
    </ScatterChart>
  ),
  radar: () => (
    <RadarChart width={400} height={300} data={data}>
      <PolarGrid />
      <PolarAngleAxis dataKey="name" />
      <PolarRadiusAxis />
      <Legend />
      <Radar dataKey="uv" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} name="UV" />
    </RadarChart>
  ),
  radialbar: () => (
    <RadialBarChart
      width={400}
      height={300}
      cx="50%"
      cy="50%"
      innerRadius={20}
      outerRadius={120}
      data={data}
    >
      <Legend />
      <RadialBar dataKey="uv" />
    </RadialBarChart>
  ),
  funnel: () => (
    <FunnelChart width={400} height={300}>
      <Tooltip />
      <Funnel dataKey="value" data={data} />
    </FunnelChart>
  ),
  sankey: () => <Sankey width={500} height={300} data={sankeyData} />,
  treemap: () => (
    <Treemap
      width={400}
      height={300}
      data={treemapData}
      dataKey="value"
      nameKey="name"
      isAnimationActive={false}
    />
  ),
  sunburst: () => <SunburstChart width={400} height={400} data={sunburstData} />,
  // Tooltip example: hover the chart to see the shared tooltip across both series.
  tooltip: () => (
    <LineChart
      width={500}
      height={320}
      data={data}
      margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
    >
      <CartesianGrid stroke="#f5f5f5" />
      <XAxis dataKey="name" />
      <YAxis />
      <Tooltip />
      <Legend />
      <Line type="monotone" dataKey="uv" stroke="#8884d8" name="UV" />
      <Line type="monotone" dataKey="pv" stroke="#82ca9d" name="PV" />
    </LineChart>
  ),
  combined,
};

const CHART_KEYS = Object.keys(charts);

const initialKey = (): string | null => {
  if (typeof window === "undefined") return null;
  const k = new URLSearchParams(window.location.search).get("chart");
  return k && k in charts ? k : null;
};

export const App = () => {
  const [selected, setSelected] = createSignal<string | null>(initialKey());

  const select = (key: string): void => {
    setSelected(key);
    // Keep the URL shareable + in sync (no reload) so `?chart=<key>` deep links and
    // the e2e suite still work.
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("chart", key);
      window.history.replaceState(null, "", url);
    }
  };

  const current = (): (() => JSX.Element) | null => {
    const k = selected();
    return k ? (charts[k] ?? null) : null;
  };

  const tabStyle = (key: string): JSX.CSSProperties => ({
    padding: "6px 12px",
    border: "1px solid #d0d0d0",
    "border-radius": "6px",
    cursor: "pointer",
    "font-size": "13px",
    background: selected() === key ? "#8884d8" : "#fff",
    color: selected() === key ? "#fff" : "#333",
    "font-weight": selected() === key ? 600 : 400,
  });

  return (
    <div
      style={{ padding: "24px", "font-family": "sans-serif", background: "#fff", color: "#000" }}
    >
      <h1 style={{ "font-size": "18px", margin: "0 0 12px" }}>solid-recharts — dev</h1>
      <nav
        aria-label="Chart gallery"
        style={{ display: "flex", "flex-wrap": "wrap", gap: "8px", "margin-bottom": "20px" }}
      >
        <For each={CHART_KEYS}>
          {(key) => (
            <button
              type="button"
              style={tabStyle(key)}
              aria-pressed={selected() === key ? "true" : "false"}
              onClick={() => select(key)}
            >
              {key}
            </button>
          )}
        </For>
      </nav>
      <Show
        when={current()}
        fallback={
          <>
            <p>
              Pick a chart above (or append <code>?chart=&lt;key&gt;</code>).
            </p>
            <Surface width={320} height={120}>
              <Dot cx={40} cy={60} r={6} fill="#ff7300" />
              <Dot cx={120} cy={40} r={6} fill="#387908" />
              <Dot cx={200} cy={80} r={6} fill="#8884d8" />
            </Surface>
          </>
        }
      >
        {(c) => (
          <div data-testid="chart-root" data-chart={selected() ?? ""}>
            {c()()}
          </div>
        )}
      </Show>
    </div>
  );
};
