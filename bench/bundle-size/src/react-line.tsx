// Single-chart entry: the most common real-world usage — one responsive
// LineChart with axes, grid, tooltip, and legend.
import { createRoot } from "react-dom/client";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { data } from "./data";

const App = () => (
  <div style={{ width: "600px", height: "300px" }}>
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="uv" stroke="#8884d8" />
        <Line type="monotone" dataKey="pv" stroke="#82ca9d" />
      </LineChart>
    </ResponsiveContainer>
  </div>
);

const root = document.getElementById("root");
if (root) createRoot(root).render(<App />);
