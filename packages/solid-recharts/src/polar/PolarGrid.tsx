// Ported from recharts 3.8.1 src/polar/PolarGrid.tsx (commit 7a23854).
//
// MINIMAL PORT — draws the polar grid: concentric polygons/circles (one per
// radius tick) + radial lines (one per angle tick), read from the polar axis
// ticks + viewBox. `getPolygonPath` copied verbatim.
//
// Solid deviations: `resolveDefaultProps`→`merge`; `clsx`→array/joined; per-line
// and per-ring rendering is a child component so prop reads stay in a tracking
// scope (not a <For> callback body). zIndex relayering IS wired (<ZIndexLayer>,
// default DefaultZIndexes.grid). DEFERRED (documented): background fill rect (fill
// defaults to "none"), generic SVG-prop passthrough beyond
// stroke/strokeWidth/strokeDasharray.
import { For, merge, Show } from "solid-js";
import type { JSX } from "@solidjs/web";
import { useAppSelector } from "../state/hooks";
import { AxisId } from "../state/cartesianAxisSlice";
import { selectPolarGridAngles, selectPolarGridRadii } from "../state/selectors/polarGridSelectors";
import { selectPolarViewBox } from "../state/selectors/polarAxisSelectors";
import { polarToCartesian } from "../util/PolarUtils";
import { DefaultZIndexes } from "../zIndex/DefaultZIndexes";
import { ZIndexLayer } from "../zIndex/ZIndexLayer";

export interface PolarGridProps {
  cx?: number;
  cy?: number;
  innerRadius?: number;
  outerRadius?: number;
  polarAngles?: ReadonlyArray<number>;
  polarRadius?: ReadonlyArray<number>;
  gridType?: "polygon" | "circle";
  radialLines?: boolean;
  angleAxisId?: AxisId;
  radiusAxisId?: AxisId;
  /**
   * Extra CSS class(es) for the grid elements (recharts: `className`). Like
   * recharts, it lands on every concentric ring (joined with the
   * `recharts-polar-grid-concentric-*` class) and on every radial line, so
   * selectors like `first:fill-muted` can target individual rings.
   */
  class?: string;
  stroke?: string;
  strokeWidth?: number | string;
  strokeDasharray?: string | number;
  /** Background fill for the space between grid lines (the outer ring). @defaultValue "none" */
  fill?: string;
  /** Opacity of the background fill. */
  fillOpacity?: number | string;
  /** Stacking order within the chart's z-index system. @defaultValue DefaultZIndexes.grid */
  zIndex?: number;
}

export const polarGridDefaultProps = {
  angleAxisId: 0,
  radiusAxisId: 0,
  gridType: "polygon",
  radialLines: true,
  stroke: "#ccc",
  strokeWidth: 1,
} as const satisfies Partial<PolarGridProps>;

const getPolygonPath = (
  radius: number,
  cx: number,
  cy: number,
  polarAngles: ReadonlyArray<number>,
): string => {
  let path = "";
  polarAngles.forEach((angle, i) => {
    const point = polarToCartesian(cx, cy, radius, angle);
    path += i ? `L ${point.x},${point.y}` : `M ${point.x},${point.y}`;
  });
  path += "Z";
  return path;
};

interface GridCommon {
  cx: number;
  cy: number;
  stroke: string | undefined;
  strokeWidth: number | string | undefined;
  // stroke-dasharray accepts only string in Solid JSX; coerced before passing.
  strokeDasharray: string | undefined;
  /** User class merged onto each grid element (recharts: `className`). */
  class?: string;
}

// recharts spreads the center coords onto the concentric <path> via
// svgPropertiesNoEvents, so the rendered DOM carries cx/cy attributes that the
// reference spec reads back. `cx`/`cy` are not part of the typed path
// attributes, so build them as raw string attributes the JSX runtime forwards.
const concentricPolygonAttrs = (cx: number, cy: number): Record<string, unknown> => ({
  cx: String(cx),
  cy: String(cy),
});

const ConcentricRing = (
  props: GridCommon & {
    radius: number;
    gridType: "polygon" | "circle";
    polarAngles: ReadonlyArray<number>;
    fill?: string;
    fillOpacity?: number | string;
  },
): JSX.Element => (
  <Show
    when={props.gridType === "circle"}
    fallback={
      <path
        {...concentricPolygonAttrs(props.cx, props.cy)}
        class={["recharts-polar-grid-concentric-polygon", props.class]}
        fill={props.fill ?? "none"}
        fill-opacity={props.fillOpacity}
        stroke={props.stroke}
        stroke-width={props.strokeWidth}
        stroke-dasharray={props.strokeDasharray}
        d={getPolygonPath(props.radius, props.cx, props.cy, props.polarAngles)}
      />
    }
  >
    <circle
      class={["recharts-polar-grid-concentric-circle", props.class]}
      fill={props.fill ?? "none"}
      fill-opacity={props.fillOpacity}
      stroke={props.stroke}
      stroke-width={props.strokeWidth}
      stroke-dasharray={props.strokeDasharray}
      cx={props.cx}
      cy={props.cy}
      r={props.radius}
    />
  </Show>
);

const RadialLine = (
  props: GridCommon & { angle: number; innerRadius: number; outerRadius: number },
): JSX.Element => {
  const start = (): { x: number; y: number } =>
    polarToCartesian(props.cx, props.cy, props.innerRadius, props.angle);
  const end = (): { x: number; y: number } =>
    polarToCartesian(props.cx, props.cy, props.outerRadius, props.angle);
  return (
    // recharts spreads the axis svg props (incl. `className`) verbatim onto each
    // radial line, so the user class is the line's only class.
    <line
      class={props.class}
      stroke={props.stroke}
      stroke-width={props.strokeWidth}
      stroke-dasharray={props.strokeDasharray}
      x1={start().x}
      y1={start().y}
      x2={end().x}
      y2={end().y}
    />
  );
};

export const PolarGrid = (props: PolarGridProps): JSX.Element => {
  const merged = merge(polarGridDefaultProps, props);
  const polarViewBox = useAppSelector(selectPolarViewBox);
  const anglesFromStore = useAppSelector((state) =>
    selectPolarGridAngles(state, merged.angleAxisId),
  );
  const radiiFromStore = useAppSelector((state) =>
    selectPolarGridRadii(state, merged.radiusAxisId),
  );

  const dash = (): string | undefined =>
    merged.strokeDasharray == null ? undefined : String(merged.strokeDasharray);

  // Solid 2.0 `merge` lets an explicit `undefined` prop override the default,
  // whereas recharts' resolveDefaultProps falls back to the default for
  // `undefined`. Re-apply the nullish fallback so `gridType={undefined}` /
  // `radialLines={undefined}` behave like the unset (defaulted) case.
  const gridType = (): "polygon" | "circle" => merged.gridType ?? "polygon";
  const radialLines = (): boolean => merged.radialLines ?? true;

  const polarAngles = (): ReadonlyArray<number> | undefined =>
    Array.isArray(merged.polarAngles) ? merged.polarAngles : anglesFromStore();
  const polarRadius = (): ReadonlyArray<number> | undefined =>
    Array.isArray(merged.polarRadius) ? merged.polarRadius : radiiFromStore();

  const geom = (): {
    cx: number;
    cy: number;
    innerRadius: number;
    outerRadius: number;
    angles: ReadonlyArray<number>;
    radii: ReadonlyArray<number>;
  } | null => {
    const vb = polarViewBox();
    const angles = polarAngles();
    const radii = polarRadius();
    if (angles == null || radii == null) {
      return null;
    }
    const cx = vb?.cx ?? merged.cx ?? 0;
    const cy = vb?.cy ?? merged.cy ?? 0;
    const innerRadius = vb?.innerRadius ?? merged.innerRadius ?? 0;
    const outerRadius = vb?.outerRadius ?? merged.outerRadius ?? 0;
    if (outerRadius <= 0) {
      return null;
    }
    return { cx, cy, innerRadius, outerRadius, angles, radii };
  };

  return (
    <Show when={geom()}>
      {(g) => (
        <ZIndexLayer zIndex={merged.zIndex ?? DefaultZIndexes.grid}>
          <g class="recharts-polar-grid">
            <g class="recharts-polar-grid-concentric">
              {/* Background fill = the outermost ring, drawn first so it sits behind
                  the stroked rings (recharts ConcentricGridPath). */}
              <Show when={merged.fill != null && merged.fill !== "none" && g().radii.length > 0}>
                <ConcentricRing
                  cx={g().cx}
                  cy={g().cy}
                  radius={Math.max(...g().radii)}
                  gridType={gridType()}
                  polarAngles={g().angles}
                  class={merged.class}
                  stroke={merged.stroke}
                  strokeWidth={merged.strokeWidth}
                  strokeDasharray={dash()}
                  fill={merged.fill}
                  fillOpacity={merged.fillOpacity}
                />
              </Show>
              <For each={g().radii}>
                {(radius) => (
                  <ConcentricRing
                    cx={g().cx}
                    cy={g().cy}
                    radius={radius}
                    gridType={gridType()}
                    polarAngles={g().angles}
                    class={merged.class}
                    stroke={merged.stroke}
                    strokeWidth={merged.strokeWidth}
                    strokeDasharray={dash()}
                  />
                )}
              </For>
            </g>
            <Show when={radialLines() && g().angles.length > 0}>
              <g class="recharts-polar-grid-angle">
                <For each={g().angles}>
                  {(angle) => (
                    <RadialLine
                      cx={g().cx}
                      cy={g().cy}
                      angle={angle}
                      innerRadius={g().innerRadius}
                      outerRadius={g().outerRadius}
                      class={merged.class}
                      stroke={merged.stroke}
                      strokeWidth={merged.strokeWidth}
                      strokeDasharray={dash()}
                    />
                  )}
                </For>
              </g>
            </Show>
          </g>
        </ZIndexLayer>
      )}
    </Show>
  );
};
