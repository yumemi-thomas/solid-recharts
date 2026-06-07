import { Surface, Dot } from "solid-recharts";

// Dev harness; grows into the component playground as the port progresses.
export const App = () => (
  <div style={{ padding: "24px", "font-family": "sans-serif" }}>
    <h1>solid-recharts — dev</h1>
    <Surface width={320} height={120}>
      <Dot cx={40} cy={60} r={6} fill="#ff7300" />
      <Dot cx={120} cy={40} r={6} fill="#387908" />
      <Dot cx={200} cy={80} r={6} fill="#8884d8" />
    </Surface>
  </div>
);
