// Ported from recharts 3.8.1 src/cartesian/GraphicalItemClipPath.tsx (commit 7a23854).
//
// Solid deviations: `useAppSelector` returns accessors, so `useNeedsClip` returns
// `Accessor<boolean>` values (per the reactive-hook porting rule). The component
// derives the clip rect in a `createMemo` (so every read tracks) and renders it
// through `<Show>`. Not yet wired into <Line> (clip is a deferred Line feature);
// this is the shared clip-path primitive for graphical items.
import { createMemo, Show, type Accessor } from "solid-js";
import type { JSX } from "@solidjs/web";
import { AxisId } from "../state/cartesianAxisSlice";
import { useAppSelector } from "../state/hooks";
import {
  implicitXAxis,
  implicitYAxis,
  selectXAxisRange,
  selectXAxisSettings,
  selectYAxisRange,
  selectYAxisSettings,
} from "../state/selectors/axisSelectors";
import { usePlotArea } from "../hooks";

export interface GraphicalItemClipPathProps {
  xAxisId: AxisId;
  yAxisId: AxisId;
  clipPathId: string;
}

export interface NeedsClip {
  needClip: Accessor<boolean>;
  needClipX: Accessor<boolean>;
  needClipY: Accessor<boolean>;
}

export function useNeedsClip(xAxisId: AxisId, yAxisId: AxisId): NeedsClip {
  const xAxis = useAppSelector((state) => selectXAxisSettings(state, xAxisId));
  const yAxis = useAppSelector((state) => selectYAxisSettings(state, yAxisId));

  const needClipX = createMemo(() => xAxis()?.allowDataOverflow ?? implicitXAxis.allowDataOverflow);
  const needClipY = createMemo(() => yAxis()?.allowDataOverflow ?? implicitYAxis.allowDataOverflow);
  const needClip = createMemo(() => needClipX() || needClipY());

  return { needClip, needClipX, needClipY };
}

export function GraphicalItemClipPath(props: GraphicalItemClipPathProps): JSX.Element {
  const plotArea = usePlotArea();
  const { needClip, needClipX, needClipY } = useNeedsClip(props.xAxisId, props.yAxisId);
  const xAxisRange = useAppSelector((state) => selectXAxisRange(state, props.xAxisId, false));
  const yAxisRange = useAppSelector((state) => selectYAxisRange(state, props.yAxisId, false));

  const rect = createMemo(() => {
    const pa = plotArea();
    if (!needClip() || pa == null) {
      return undefined;
    }
    const xr = xAxisRange();
    const yr = yAxisRange();
    return {
      x: needClipX() && xr ? Math.min(xr[0], xr[1]) : pa.x - pa.width / 2,
      y: needClipY() && yr ? Math.min(yr[0], yr[1]) : pa.y - pa.height / 2,
      width: needClipX() && xr ? Math.abs(xr[1] - xr[0]) : pa.width * 2,
      height: needClipY() && yr ? Math.abs(yr[1] - yr[0]) : pa.height * 2,
    };
  });

  return (
    <Show when={rect()}>
      {(r) => (
        <clipPath id={`clipPath-${props.clipPathId}`}>
          <rect x={r().x} y={r().y} width={r().width} height={r().height} />
        </clipPath>
      )}
    </Show>
  );
}
