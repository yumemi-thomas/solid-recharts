// Ported subset of recharts 3.8.1 test/_data.ts (commit 7a23854) — the shared
// sample datasets specs import. Grows as more specs need more fixtures.
import type { SunburstData } from "../src/chart/SunburstChart";

export const PageData = [
  { name: "Page A", uv: 400, pv: 2400, amt: 2400 },
  { name: "Page B", uv: 300, pv: 4567, amt: 2400 },
  { name: "Page C", uv: 300, pv: 1398, amt: 2400 },
  { name: "Page D", uv: 200, pv: 9800, amt: 2400 },
  { name: "Page E", uv: 278, pv: 3908, amt: 2400 },
  { name: "Page F", uv: 189, pv: 4800, amt: 2400 },
];

// Ported from recharts 3.8.1 test/_data.ts `misbehavedData`; used by axis
// selector specs to verify duplicated category handling.
export const misbehavedData = [
  { x: null },
  { x: "Jan" },
  { x: undefined },
  { x: "Feb" },
  { x: [] },
  { x: "Mar" },
  { x: () => undefined },
  { x: "Apr" },
  { x: {} },
  { x: "May" },
  { x: NaN },
  { x: "Jun" },
  { x: new Map() },
  { x: "Jul" },
  { x: Symbol.for("mock symbol") },
  { x: "Aug" },
  { x: new Promise(() => undefined) },
];

// Ported from recharts 3.8.1 storybook/stories/data/Page.ts `pageData` (the 7-row
// dataset many state-selector specs import). Distinct from `PageData` above.
export const pageData = [
  { name: "Page A", uv: 590, pv: 800, amt: 1400 },
  { name: "Page B", uv: 590, pv: 800, amt: 1400 },
  { name: "Page C", uv: 868, pv: 967, amt: 1506 },
  { name: "Page D", uv: 1397, pv: 1098, amt: 989 },
  { name: "Page E", uv: 1480, pv: 1200, amt: 1228 },
  { name: "Page F", uv: 1520, pv: 1108, amt: 1100 },
  { name: "Page G", uv: 1400, pv: 680, amt: 1700 },
];

// Ported from recharts 3.8.1 storybook/stories/data/Page.ts `pageDataWithFillColor`.
export const pageDataWithFillColor = [
  { name: "18-24", uv: 31.47, pv: 2400, amt: 1400, fill: "#8884d8" },
  { name: "25-29", uv: 26.69, pv: 4567, amt: 720, fill: "#83a6ed" },
  { name: "30-34", uv: 15.69, pv: 1398, amt: 680, fill: "#8dd1e1" },
  { name: "35-39", uv: 8.22, pv: 9800, amt: 1700, fill: "#82ca9d" },
  { name: "40-49", uv: 8.63, pv: 3908, amt: 1500, fill: "#a4de6c" },
  { name: "50+", uv: 2.63, pv: 4800, amt: 680, fill: "#d0ed57" },
  { name: "unknown", uv: 6.67, pv: 4800, amt: 690, fill: "#ffc658" },
];

// Ported from recharts 3.8.1 storybook/stories/data/Coordinate.ts.
export const coordinateWithValueData = [
  { x: 10, y: 50, value: 100 },
  { x: 150, y: 150, value: 100 },
  { x: 290, y: 70, value: 100 },
  { x: 430, y: 60, value: 100 },
  { x: 570, y: 30, value: 100 },
];

// Ported from recharts 3.8.1 storybook/stories/data/Time.ts.
export const timeData = [
  { x: new Date("2019-07-04T00:00:00.000Z"), y: 5, z: 7 },
  { x: new Date("2019-07-05T00:00:00.000Z"), y: 30, z: 7 },
  { x: new Date("2019-07-06T00:00:00.000Z"), y: 50, z: 12 },
  { x: new Date("2019-07-07T00:00:00.000Z"), y: 43, z: 35 },
  { x: new Date("2019-07-08T00:00:00.000Z"), y: 20, z: 14 },
  { x: new Date("2019-07-09T00:00:00.000Z"), y: -20, z: -10 },
  { x: new Date("2019-07-10T00:00:00.000Z"), y: 30, z: 53 },
];

export const dateWithValueData = [
  { time: 1483142400000, value: 10 },
  { time: 1483146000000, value: 20 },
  { time: 1483147800000, value: 20 },
  { time: 1483149600000, value: 30 },
  { time: 1483153200000, value: 10 },
  { time: 1483155000000, value: 40 },
  { time: 1483156800000, value: 40 },
  { time: 1483160400000, value: 20 },
  { time: 1483164000000, value: 30 },
  { time: 1483167600000, value: 10 },
  { time: 1483171200000, value: 60 },
  { time: 1483173000000, value: 60 },
  { time: 1483178400000, value: 60 },
];

// Ported from recharts 3.8.1 test/_data.ts `exampleRadarData`.
export const exampleRadarData = [
  { name: "iPhone 3GS", value: 420, half: 210 },
  { name: "iPhone 4", value: 460, half: 230 },
  { name: "iPhone 4s", value: 999, half: 500 },
  { name: "iPhone 5", value: 500, half: 250 },
  { name: "iPhone 5s", value: 864, half: 432 },
  { name: "iPhone 6", value: 650, half: 325 },
  { name: "iPhone 6s", value: 765, half: 383 },
  { name: "iPhone 5se", value: 365, half: 183 },
];

// Ported from recharts 3.8.1 test/_data.ts `exampleSankeyData`.
export const exampleSankeyData = {
  nodes: [
    { name: "Agricultural waste" },
    { name: "Bio-conversion" },
    { name: "Liquid" },
    { name: "Losses" },
    { name: "Solid" },
    { name: "Gas" },
    { name: "Biofuel imports" },
    { name: "Biomass imports" },
    { name: "Coal imports" },
    { name: "Coal" },
    { name: "Coal reserves" },
    { name: "District heating" },
    { name: "Industry" },
    { name: "Heating and cooling - commercial" },
    { name: "Heating and cooling - homes" },
    { name: "Electricity grid" },
    { name: "Over generation / exports" },
    { name: "H2 conversion" },
    { name: "Road transport" },
    { name: "Agriculture" },
    { name: "Rail transport" },
    { name: "Lighting & appliances - commercial" },
    { name: "Lighting & appliances - homes" },
    { name: "Gas imports" },
    { name: "Ngas" },
    { name: "Gas reserves" },
    { name: "Thermal generation" },
    { name: "Geothermal" },
    { name: "H2" },
    { name: "Hydro" },
    { name: "International shipping" },
    { name: "Domestic aviation" },
    { name: "International aviation" },
    { name: "National navigation" },
    { name: "Marine algae" },
    { name: "Nuclear" },
    { name: "Oil imports" },
    { name: "Oil" },
    { name: "Oil reserves" },
    { name: "Other waste" },
    { name: "Pumped heat" },
    { name: "Solar PV" },
    { name: "Solar Thermal" },
    { name: "Solar" },
    { name: "Tidal" },
    { name: "UK land based bioenergy" },
    { name: "Wave" },
    { name: "Wind" },
  ],
  links: [
    { source: 0, target: 1, value: 124.729 },
    { source: 1, target: 2, value: 0.597 },
    { source: 1, target: 3, value: 26.862 },
    { source: 1, target: 4, value: 280.322 },
    { source: 1, target: 5, value: 81.144 },
    { source: 6, target: 2, value: 35 },
    { source: 7, target: 4, value: 35 },
    { source: 8, target: 9, value: 11.606 },
    { source: 10, target: 9, value: 63.965 },
    { source: 9, target: 4, value: 75.571 },
    { source: 11, target: 12, value: 10.639 },
    { source: 11, target: 13, value: 22.505 },
    { source: 11, target: 14, value: 46.184 },
    { source: 15, target: 16, value: 104.453 },
    { source: 15, target: 14, value: 113.726 },
    { source: 15, target: 17, value: 27.14 },
    { source: 15, target: 12, value: 342.165 },
    { source: 15, target: 18, value: 37.797 },
    { source: 15, target: 19, value: 4.412 },
    { source: 15, target: 13, value: 40.858 },
    { source: 15, target: 3, value: 56.691 },
    { source: 15, target: 20, value: 7.863 },
    { source: 15, target: 21, value: 90.008 },
    { source: 15, target: 22, value: 93.494 },
    { source: 23, target: 24, value: 40.719 },
    { source: 25, target: 24, value: 82.233 },
    { source: 5, target: 13, value: 0.129 },
    { source: 5, target: 3, value: 1.401 },
    { source: 5, target: 26, value: 151.891 },
    { source: 5, target: 19, value: 2.096 },
    { source: 5, target: 12, value: 48.58 },
    { source: 27, target: 15, value: 7.013 },
    { source: 17, target: 28, value: 20.897 },
    { source: 17, target: 3, value: 6.242 },
    { source: 28, target: 18, value: 20.897 },
    { source: 29, target: 15, value: 6.995 },
    { source: 2, target: 12, value: 121.066 },
    { source: 2, target: 30, value: 128.69 },
    { source: 2, target: 18, value: 135.835 },
    { source: 2, target: 31, value: 14.458 },
    { source: 2, target: 32, value: 206.267 },
    { source: 2, target: 19, value: 3.64 },
    { source: 2, target: 33, value: 33.218 },
    { source: 2, target: 20, value: 4.413 },
    { source: 34, target: 1, value: 4.375 },
    { source: 24, target: 5, value: 122.952 },
    { source: 35, target: 26, value: 839.978 },
    { source: 36, target: 37, value: 504.287 },
    { source: 38, target: 37, value: 107.703 },
    { source: 37, target: 2, value: 611.99 },
    { source: 39, target: 4, value: 56.587 },
    { source: 39, target: 1, value: 77.81 },
    { source: 40, target: 14, value: 193.026 },
    { source: 40, target: 13, value: 70.672 },
    { source: 41, target: 15, value: 59.901 },
    { source: 42, target: 14, value: 19.263 },
    { source: 43, target: 42, value: 19.263 },
    { source: 43, target: 41, value: 59.901 },
    { source: 4, target: 19, value: 0.882 },
    { source: 4, target: 26, value: 400.12 },
    { source: 4, target: 12, value: 46.477 },
    { source: 26, target: 15, value: 525.531 },
    { source: 26, target: 3, value: 787.129 },
    { source: 26, target: 11, value: 79.329 },
    { source: 44, target: 15, value: 9.452 },
    { source: 45, target: 1, value: 182.01 },
    { source: 46, target: 15, value: 19.013 },
    { source: 47, target: 15, value: 289.366 },
  ],
};

// Ported from recharts 3.8.1 test/_data.ts `exampleTreemapData`.
export const exampleTreemapData = [
  {
    rank: "1",
    name: "A",
    children: [
      { rank: "21", name: "U", value: 12490887132 },
      { rank: "22", name: "V", value: 10772738863 },
      { rank: "23", name: "W", value: 8236223813 },
    ],
  },
  { rank: "2", name: "B", value: 12490887132 },
  { rank: "3", name: "C", value: 10772738863 },
  { rank: "4", name: "D", value: 8236223813 },
  { rank: "5", name: "E", value: 6583448127 },
  { rank: "6", name: "F", value: 5834718183 },
  { rank: "7", name: "G", value: 5559852006 },
  { rank: "8", name: "H", value: 4651272674 },
  { rank: "9", name: "I", value: 4248844205 },
  { rank: "10", name: "J", value: 3862568602 },
  { rank: "11", name: "K", value: 3803070009 },
  { rank: "12", name: "L", value: 3480361169 },
  { rank: "13", name: "M", value: 3476552989 },
  { rank: "14", name: "N", value: 3147229713 },
  { rank: "15", name: "O", value: 2907504853 },
  { rank: "16", name: "P", value: 2555558916 },
  { rank: "17", name: "Q", value: 2149183029 },
  { rank: "18", name: "R", value: 2107468912 },
  { rank: "19", name: "S", value: 2088055427 },
  { rank: "20", name: "T", value: 1885463047 },
];

// Ported from recharts 3.8.1 test/_data.ts `exampleSunburstData`.
export const exampleSunburstData: SunburstData = {
  name: "Root",
  value: 100,
  children: [
    {
      name: "Child1",
      fill: "#264653",
      value: 30,
      children: [
        {
          name: "third child",
          value: 10,
        },
      ],
    },
    {
      name: "Child2",
      fill: "#2a9d8f",
      value: 20,
      children: [
        {
          name: "another child",
          value: 10,
        },
      ],
    },
    {
      name: "Child3",
      fill: "#e9c46a",
      value: 20,
    },
  ],
};

// Ported from recharts 3.8.1 test/_data.ts `numericalData`.
export const numericalData = [
  { value: "Luck", percent: 10 },
  { value: "Skill", percent: 20 },
  { value: "Concentrated power of will", percent: 15 },
  { value: "Pleasure", percent: 50 },
  { value: "Pain", percent: 50 },
  { value: "Reason to remember the name", percent: 100 },
];

// Ported from @recharts/devtools src/random.ts + src/generateMockData.ts.
function* mockDataRandom(seed: number): Generator<number, number, unknown> {
  const m = 2 ** 16 + 1;
  const a = 75;
  const c = 74;
  let x = seed;
  if (x > 0 && x < 1) {
    x = Math.round(x * 1000);
  }
  while (x < 0) {
    x += m;
  }
  while (true) {
    x = (a * x + c) % m;
    yield Math.round(x);
  }
}

function mockDataBetween(
  rng: Generator<number, number, unknown>,
  min: number,
  max: number,
): number {
  const val = rng.next().value;
  if (val === undefined) {
    throw new Error("unexpected end of random generator");
  }
  return (val % (max - min)) + min;
}

/** Seeded mock chart rows (`label`, `x`, `y`, `z`) — same algorithm as `@recharts/devtools`. */
export function generateMockData(
  length: number,
  seed: number,
): Array<{ label: string; x: number; y: number; z: number }> {
  const result: Array<{ label: string; x: number; y: number; z: number }> = [];
  const gen = mockDataRandom(seed);
  for (let i = 0; i < length; i++) {
    result.push({
      label: `Iter: ${i}`,
      x: mockDataBetween(gen, 100, 300),
      y: mockDataBetween(gen, 400, 800),
      z: mockDataBetween(gen, 1000, 2000),
    });
  }
  return result;
}

// Port of recharts test/_data.ts `dataWithSpecialNameAndFillProperties`: rows carry
// a `fill` (read implicitly by Scatter) and a `name` (which is NOT auto-rendered).
export const dataWithSpecialNameAndFillProperties = [
  { name: "name1", fill: "fill1", value: 12 },
  { name: "name2", fill: "fill2", value: 34 },
  { name: "name3", fill: "fill3", value: 56 },
  { name: "name4", fill: "fill4", value: 78 },
];

// Port of recharts storybook/stories/data/Page.ts `rangeData` (day → [low, high] temperature).
export const rangeData = [
  { day: "05-01", temperature: [-1, 10] },
  { day: "05-02", temperature: [2, 15] },
  { day: "05-03", temperature: [3, 12] },
  { day: "05-04", temperature: [4, 12] },
  { day: "05-05", temperature: [12, 16] },
  { day: "05-06", temperature: [5, 16] },
  { day: "05-07", temperature: [3, 12] },
  { day: "05-08", temperature: [0, 8] },
  { day: "05-09", temperature: [-3, 5] },
];

// Ported from recharts 3.8.1 test/_data.ts — box-plot-shaped rows used by
// ScatterChart Composed-with-stacks specs (ZAxis `size` vs stacked Bars).
export const boxPlotData = [
  {
    min: 100,
    bottomWhisker: 100,
    bottomBox: 50,
    topBox: 200,
    topWhisker: 200,
    average: 150,
    size: 150,
  },
  {
    min: 200,
    bottomWhisker: 200,
    bottomBox: 200,
    topBox: 100,
    topWhisker: 100,
    average: 550,
    size: 250,
  },
  {
    min: 0,
    bottomWhisker: 200,
    bottomBox: 200,
    topBox: 200,
    topWhisker: 200,
    average: 400,
    size: 350,
  },
];
