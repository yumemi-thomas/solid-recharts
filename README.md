# solid-recharts

[Recharts](https://recharts.org) for [SolidJS 1.x](https://www.solidjs.com/) — the composable
charting API you know, rebuilt on fine-grained reactivity.

A behavior-parity port of recharts (reference pinned at **v3.9.2**): same components, same props,
same rendered SVG — with recharts' internal Redux/reselect layer replaced by Solid-native stores
and projections, and a stricter type surface (no `any`, no `as`).

```tsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "solid-recharts";

<LineChart width={500} height={300} data={data}>
  <CartesianGrid strokeDasharray="3 3" />
  <XAxis dataKey="name" />
  <YAxis />
  <Tooltip />
  <Line type="monotone" dataKey="uv" stroke="#82ca9d" />
</LineChart>;
```

## Chart families

`LineChart`, `AreaChart`, `BarChart`, `ComposedChart`, `ScatterChart`, `PieChart`, `RadarChart`,
`RadialBarChart`, `FunnelChart`, `Treemap`, `Sankey`, `SunburstChart` — plus the full component
surface: axes, grids, `Tooltip`, `Legend`, `Brush` (with panorama), `ResponsiveContainer`,
reference lines/areas/dots, `ErrorBar`, `Cell`, labels, custom shapes, animations, and
declarative `zIndex` layering.

## Differences from recharts

Props match recharts exactly, except a closed list of framework-idiomatic renames:

| recharts (React)       | solid-recharts               |
| ---------------------- | ---------------------------- |
| `className`            | `class`                      |
| `style` (React object) | Solid `JSX.CSSProperties`    |
| React synthetic events | Solid delegated DOM handlers |
| `forwardRef`           | `ref` prop                   |

Everything else — data shape, `dataKey`, layout, domain/ticks, stacking, animation props — is
unchanged, so recharts documentation and examples translate 1:1.

## Requirements

- `solid-js` **1.9 or newer** as a peer dependency.
- This `1.x` branch is the Solid 1 maintenance line; `main` targets Solid 2.

## Repository layout

| path                        | what it is                                                      |
| --------------------------- | --------------------------------------------------------------- |
| `packages/solid-recharts`   | the library                                                     |
| `app/docs`                  | documentation site (TanStack Start; standalone pnpm root)       |
| `app/dev`                   | dev playground used by the e2e suite                            |
| `e2e/`                      | Playwright real-browser rendering + a11y gates                  |
| `bench/bundle-size`         | bundle-size comparison vs recharts                              |
| `vendor/recharts-reference` | pinned recharts checkout (test-parity reference; not committed) |

## Development

```sh
pnpm install
pnpm run ref:setup   # clone the pinned recharts reference (required by the test gate)
pnpm test            # ~5400 ported recharts specs under jsdom
npx playwright test  # real-browser rendering + a11y e2e
vp check --fix       # format + type-aware lint
pnpm -r typecheck
```

The test suite is a port of recharts' own suite — every assertion is lifted from upstream, never
authored against this implementation. See [AGENTS.md](AGENTS.md) for the parity discipline.

Docs site: `cd app/docs && pnpm install && pnpm dev` (kept outside the workspace on purpose —
see the comment in `pnpm-workspace.yaml`).

## License

[MIT](LICENSE). Derived from [recharts](https://github.com/recharts/recharts) (MIT), rebuilt for
SolidJS 1.x.
