// Shared sample datasets so examples stay focused on chart markup.

export interface PageStat {
  name: string;
  uv: number;
  pv: number;
  amt: number;
}

export const pageStats: PageStat[] = [
  { name: "Page A", uv: 4000, pv: 2400, amt: 2400 },
  { name: "Page B", uv: 3000, pv: 1398, amt: 2210 },
  { name: "Page C", uv: 2000, pv: 9800, amt: 2290 },
  { name: "Page D", uv: 2780, pv: 3908, amt: 2000 },
  { name: "Page E", uv: 1890, pv: 4800, amt: 2181 },
  { name: "Page F", uv: 2390, pv: 3800, amt: 2500 },
  { name: "Page G", uv: 3490, pv: 4300, amt: 2100 },
];

export const monthlySales = [
  { month: "Jan", online: 4200, retail: 2400 },
  { month: "Feb", online: 3800, retail: 2210 },
  { month: "Mar", online: 5100, retail: 2290 },
  { month: "Apr", online: 4780, retail: 2000 },
  { month: "May", online: 5890, retail: 2181 },
  { month: "Jun", online: 6390, retail: 2500 },
  { month: "Jul", online: 7490, retail: 3100 },
];

export const browserShare = [
  { name: "Chrome", value: 6486 },
  { name: "Safari", value: 1892 },
  { name: "Edge", value: 521 },
  { name: "Firefox", value: 263 },
  { name: "Other", value: 838 },
];

export const PIE_COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];

export const skillData = [
  { subject: "Math", a: 120, b: 110, fullMark: 150 },
  { subject: "Chinese", a: 98, b: 130, fullMark: 150 },
  { subject: "English", a: 86, b: 130, fullMark: 150 },
  { subject: "Geography", a: 99, b: 100, fullMark: 150 },
  { subject: "Physics", a: 85, b: 90, fullMark: 150 },
  { subject: "History", a: 65, b: 85, fullMark: 150 },
];

export const scatterPoints = [
  { x: 100, y: 200, z: 200 },
  { x: 120, y: 100, z: 260 },
  { x: 170, y: 300, z: 400 },
  { x: 140, y: 250, z: 280 },
  { x: 150, y: 400, z: 500 },
  { x: 110, y: 280, z: 200 },
];

export const funnelSteps = [
  { name: "Visit", value: 100, fill: "#8884d8" },
  { name: "Sign up", value: 80, fill: "#83a6ed" },
  { name: "Trial", value: 50, fill: "#8dd1e1" },
  { name: "Purchase", value: 40, fill: "#82ca9d" },
  { name: "Renew", value: 26, fill: "#a4de6c" },
];

export const treemapData = [
  {
    name: "axis",
    children: [
      { name: "XAxis", size: 24593 },
      { name: "YAxis", size: 21479 },
      { name: "ZAxis", size: 1398 },
      { name: "CartesianAxis", size: 19382 },
    ],
  },
  {
    name: "chart",
    children: [
      { name: "LineChart", size: 11070 },
      { name: "BarChart", size: 12921 },
      { name: "AreaChart", size: 9531 },
      { name: "PieChart", size: 8583 },
    ],
  },
  {
    name: "shape",
    children: [
      { name: "Rectangle", size: 8194 },
      { name: "Curve", size: 7124 },
      { name: "Sector", size: 6210 },
      { name: "Dot", size: 1782 },
    ],
  },
];

export const sankeyData = {
  nodes: [
    { name: "Visit" },
    { name: "Direct" },
    { name: "Search" },
    { name: "Sign up" },
    { name: "Purchase" },
    { name: "Churn" },
  ],
  links: [
    { source: 0, target: 1, value: 60 },
    { source: 0, target: 2, value: 40 },
    { source: 1, target: 3, value: 30 },
    { source: 2, target: 3, value: 25 },
    { source: 3, target: 4, value: 35 },
    { source: 3, target: 5, value: 20 },
  ],
};

export const sunburstData = {
  name: "root",
  value: 100,
  children: [
    {
      name: "A",
      value: 40,
      fill: "#0088FE",
      children: [
        { name: "A1", value: 25, fill: "#0088FE" },
        { name: "A2", value: 15, fill: "#3aa3ff" },
      ],
    },
    {
      name: "B",
      value: 35,
      fill: "#00C49F",
      children: [{ name: "B1", value: 35, fill: "#00C49F" }],
    },
    { name: "C", value: 25, fill: "#FFBB28" },
  ],
};
