// Ported from recharts 3.8.1 src/cartesian/Brush.tsx (commit 7a23854).
//
// A draggable data-window control rendered below the plot area. It registers its
// height into the brush slice (the offset reserves that space), maps the current
// dataStartIndex/dataEndIndex to pixel positions via a scalePoint over the data
// indices, and renders a background, a draggable slide, two travellers and the
// start/end tick text. Dragging a traveller or the slide dispatches
// setDataStartEndIndexes, which re-filters every graphical item's data window.
//
// Solid deviations: the React class component (`BrushWithState` + lifecycle) →
// signals + a sync `createEffect`; `getDerivedStateFromProps` (sync startX/endX
// from indices when idle) → an effect guarded by the interaction flags; window
// drag listeners attached on drag-start and removed via `onCleanup`.
// Panorama (advanced `<Brush>{graphicalItems}</Brush>` form) IS wired: the children
// render under PanoramaContextProvider → RootSurface routes them to a nested Surface
// at the brush rect, using isPanorama=true (full data range + the brush viewBox).
// Keyboard (ArrowLeft/Right move a focused traveller by one index) and touch
// (the same drag via changedTouches) are WIRED.
// `dy`, `onDragEnd` (fires at drag release), and `leaveTimeOut` (drag ends after
// the pointer leaves the brush) are WIRED.
// Controlled startIndex/endIndex prop-sync is WIRED: the effect below dispatches
// prop changes into the store, and traveller pixels DERIVE from the store indices
// (drag overrides win mid-interaction, the Solid equivalent of recharts'
// getDerivedStateFromProps "don't sync while interacting" guards). Covered by the
// "with controlled startIndex/endIndex" Brush.spec block.
import { createMemo, createSignal, onCleanup, Show, mergeProps, createEffect, on } from "solid-js";
import type { JSX } from "solid-js";
import { scalePoint } from "d3-scale";
import { useAppSelector, useAppStore } from "../state/hooks";
import { Layer } from "../container/Layer";
import { Text } from "../component/Text";
import { RootSurface } from "../container/RootSurface";
import { PanoramaContextProvider } from "../context/PanoramaContext";
import { selectChartDataWithIndexes } from "../state/selectors/dataSelectors";
import { selectBrushDimensions } from "../state/selectors/brushSelectors";
import { ChartData } from "../state/chartDataSlice";
import { DataKey, Padding } from "../util/types";
import { getValueByDataKey } from "../util/ChartUtils";
import { isNumber, isNotNil } from "../util/DataUtils";
import { unregisterOnCleanup } from "../state/unregisterOnCleanup";

export type BrushTickFormatter = (value: unknown, index: number) => string | number;
type BrushTravellerId = "startX" | "endX";

export interface BrushProps {
  dataKey?: DataKey<unknown>;
  /** Explicit x; defaults to the plot's left edge. */
  x?: number;
  /** Explicit y; defaults to just below the plot area. */
  y?: number;
  /** Explicit width; defaults to the plot width. */
  width?: number;
  /** @defaultValue 40 */
  height?: number;
  /** @defaultValue 5 */
  travellerWidth?: number;
  /** Index snapping step. @defaultValue 1 */
  gap?: number;
  padding?: Padding;
  fill?: string;
  stroke?: string;
  startIndex?: number;
  endIndex?: number;
  tickFormatter?: BrushTickFormatter;
  /** Accessible label for the travellers; falls back to `Min value: …, Max value: …`. */
  ariaLabel?: string;
  /** Always show the start/end text (not only while interacting). @defaultValue false */
  alwaysShowText?: boolean;
  /** Extra vertical offset added to the brush's y position. @defaultValue 0 */
  dy?: number;
  onChange?: (next: { startIndex: number; endIndex: number }) => void;
  /** Fired once at the end of a drag (mouseup/touchend or leave timeout). */
  onDragEnd?: (next: { startIndex: number; endIndex: number }) => void;
  /** Delay (ms) before a drag ends when the pointer leaves the brush. @defaultValue 1000 */
  leaveTimeOut?: number;
  class?: string;
  id?: string;
  /**
   * Panorama: graphical items (e.g. <Line/>) mirrored inside the brush as an
   * overview of the FULL dataset. Rendered under PanoramaContextProvider, so they
   * use isPanorama=true (full data range + the brush viewBox).
   */
  children?: JSX.Element;
}

export const brushDefaultProps = {
  height: 40,
  travellerWidth: 5,
  gap: 1,
  fill: "#fff",
  stroke: "#666",
  padding: { top: 1, right: 1, bottom: 1, left: 1 },
  alwaysShowText: false,
  leaveTimeOut: 1000,
} as const satisfies Partial<BrushProps>;

const range0 = (n: number): number[] => {
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    out.push(i);
  }
  return out;
};

// Binary search: which data index does pixel `x` fall in? (recharts getIndexInRange)
function getIndexInRange(valueRange: number[], x: number): number {
  let start = 0;
  let end = valueRange.length - 1;
  while (end - start > 1) {
    const middle = Math.floor((start + end) / 2);
    const middleValue = valueRange[middle];
    if (middleValue != null && middleValue > x) {
      end = middle;
    } else {
      start = middle;
    }
  }
  const endValue = valueRange[end];
  return endValue != null && x >= endValue ? end : start;
}

// Map traveller pixel positions to {startIndex, endIndex} with gap snapping.
function getIndex({
  startX,
  endX,
  scaleValues,
  gap,
  dataLength,
}: {
  startX: number;
  endX: number;
  scaleValues: number[];
  gap: number;
  dataLength: number;
}): { startIndex: number; endIndex: number } {
  const lastIndex = dataLength - 1;
  const minIndex = getIndexInRange(scaleValues, Math.min(startX, endX));
  const maxIndex = getIndexInRange(scaleValues, Math.max(startX, endX));
  return {
    startIndex: minIndex - (minIndex % gap),
    endIndex: maxIndex === lastIndex ? lastIndex : maxIndex - (maxIndex % gap),
  };
}

function getTextOfTick(
  data: ChartData,
  index: number,
  dataKey: DataKey<unknown> | undefined,
  tickFormatter: BrushTickFormatter | undefined,
): string | number {
  const value = getValueByDataKey(data[index], dataKey, index);
  const text = typeof value === "number" || typeof value === "string" ? value : index;
  return typeof tickFormatter === "function" ? tickFormatter(text, index) : text;
}

// Accessible label for a traveller: the `name` of the start/end data rows.
// (sic, per recharts: the label says "value" but reads the `name` property.)
function getNameFromUnknown(value: unknown): string | undefined {
  if (isNotNil(value) && typeof value === "object" && "name" in value) {
    const { name }: { name: unknown } = value;
    if (typeof name === "string") {
      return name;
    }
  }
  return undefined;
}

function getAriaLabel(data: ChartData, startIndex: number, endIndex: number): string {
  const start = getNameFromUnknown(data[startIndex]);
  const end = getNameFromUnknown(data[endIndex]);
  return `Min value: ${start}, Max value: ${end}`;
}

function DefaultTraveller(props: {
  x: number;
  y: number;
  width: number;
  height: number;
  stroke: string | undefined;
}): JSX.Element {
  const lineY = (): number => Math.floor(props.y + props.height / 2) - 1;
  return (
    <>
      <rect
        x={props.x}
        y={props.y}
        width={props.width}
        height={props.height}
        fill={props.stroke}
        stroke="none"
      />
      <line
        x1={props.x + 1}
        y1={lineY()}
        x2={props.x + props.width - 1}
        y2={lineY()}
        fill="none"
        stroke="#fff"
      />
      <line
        x1={props.x + 1}
        y1={lineY() + 2}
        x2={props.x + props.width - 1}
        y2={lineY() + 2}
        fill="none"
        stroke="#fff"
      />
    </>
  );
}

export const Brush = (props: BrushProps): JSX.Element => {
  const store = useAppStore();
  const merged = mergeProps(brushDefaultProps, props);

  const dimensions = useAppSelector(selectBrushDimensions);
  const dataState = useAppSelector(selectChartDataWithIndexes);

  const data = (): ChartData => dataState()?.chartData ?? [];
  const startIndex = (): number => dataState()?.dataStartIndex ?? 0;
  const endIndex = (): number => dataState()?.dataEndIndex ?? 0;

  // The brush's own pixel rect (x/width come from the chart offset unless overridden).
  const x = (): number => merged.x ?? dimensions()?.x ?? 0;
  const y = (): number => (merged.y ?? dimensions()?.y ?? 0) + (merged.dy ?? 0);
  const width = (): number => merged.width ?? dimensions()?.width ?? 0;

  // Register brush settings so the offset reserves `height` at the bottom. Two-arg
  // createEffect (compute → apply): the store write happens in the untracked apply
  // phase, like the other Set* registration components.
  createEffect(
    on(
      () => ({
        x: merged.x,
        y: merged.y,
        width: merged.width,
        height: merged.height,
        padding: { ...merged.padding },
      }),
      (settings) => store?.actions.brush.setBrushSettings(settings),
    ),
  );
  unregisterOnCleanup(() => store?.actions.brush.setBrushSettings(null));

  // Sync controlled start/end index props into the store (recharts BrushInternal
  // useEffect — always dispatch; the reducer ignores undefined fields).
  createEffect(
    on(
      () => ({
        startIndex: merged.startIndex,
        endIndex: merged.endIndex,
        chartData: dataState()?.chartData,
      }),
      (idx) => {
        store?.actions.chartData.setDataStartEndIndexes({
          startIndex: idx.startIndex,
          endIndex: idx.endIndex,
        });
      },
    ),
  );

  // scalePoint over the data indices → pixel positions across the brush width.
  const scale = createMemo(() => {
    const len = data().length;
    if (len === 0 || width() <= 0) {
      return null;
    }
    return scalePoint<number>()
      .domain(range0(len))
      .range([x(), x() + width() - merged.travellerWidth]);
  });
  const scaleValues = createMemo<number[]>(() => {
    const sc = scale();
    return sc
      ? sc
          .domain()
          .map((d) => sc(d))
          .filter(isNotNil)
      : [];
  });

  // Interaction state.
  const [isTravellerMoving, setIsTravellerMoving] = createSignal(false);
  const [isSlideMoving, setIsSlideMoving] = createSignal(false);
  const [isTextActive, setIsTextActive] = createSignal(false);
  const [isTravellerFocused, setIsTravellerFocused] = createSignal(false);
  const [movingTravellerId, setMovingTravellerId] = createSignal<BrushTravellerId | null>(null);
  let dragStartPageX = 0;

  // Traveller pixels are DERIVED from the current indices via the scale; a drag sets
  // a per-traveller pixel override (so the handle tracks the cursor mid-drag), which
  // is cleared on release so the handle snaps to the (now-updated) index position.
  const [overrideStartX, setOverrideStartX] = createSignal<number | null>(null);
  const [overrideEndX, setOverrideEndX] = createSignal<number | null>(null);

  // Recharts keeps the exact pixel positions reached during a drag, even if the
  // movement did not cross an index boundary. Re-sync them only when inputs that
  // define the scale or controlled selection change.
  createEffect(
    on(
      () => ({
        chartData: data(),
        startIndex: merged.startIndex,
        endIndex: merged.endIndex,
        x: x(),
        width: width(),
        travellerWidth: merged.travellerWidth,
      }),
      () => {
        setOverrideStartX(null);
        setOverrideEndX(null);
      },
    ),
  );
  const startX = createMemo<number>(() => {
    const o = overrideStartX();
    if (o != null) {
      return o;
    }
    const sc = scale();
    return sc ? (sc(startIndex()) ?? 0) : 0;
  });
  const endX = createMemo<number>(() => {
    const o = overrideEndX();
    if (o != null) {
      return o;
    }
    const sc = scale();
    return sc ? (sc(endIndex()) ?? 0) : 0;
  });

  const onChange = (next: { startIndex: number; endIndex: number }): void => {
    if (next.startIndex === startIndex() && next.endIndex === endIndex()) {
      return;
    }
    merged.onChange?.(next);
    store?.actions.chartData.setDataStartEndIndexes(next);
  };

  // ---- Drag wiring (mouse + touch) ----
  // pageX from a mouse event or the first changed touch (null if neither).
  const getPageX = (e: MouseEvent | TouchEvent): number | null => {
    if ("changedTouches" in e) {
      const t = e.changedTouches[0];
      return t ? t.pageX : null;
    }
    return e.pageX;
  };

  const handleTravellerMove = (pageX: number): void => {
    const id = movingTravellerId();
    const vals = scaleValues();
    if (id == null || vals.length === 0) {
      return;
    }
    // Read both pixels up front; a createMemo doesn't recompute synchronously after
    // setOverride*, so getIndex must use the freshly-computed local values.
    const curStartX = startX();
    const curEndX = endX();
    const prevValue = id === "startX" ? curStartX : curEndX;
    let delta = pageX - dragStartPageX;
    if (delta > 0) {
      delta = Math.min(delta, x() + width() - merged.travellerWidth - prevValue);
    } else if (delta < 0) {
      delta = Math.max(delta, x() - prevValue);
    }
    const nextValue = prevValue + delta;
    dragStartPageX = pageX;
    if (id === "startX") {
      setOverrideStartX(nextValue);
      onChange(
        getIndex({
          startX: nextValue,
          endX: curEndX,
          scaleValues: vals,
          gap: merged.gap,
          dataLength: data().length,
        }),
      );
    } else {
      setOverrideEndX(nextValue);
      onChange(
        getIndex({
          startX: curStartX,
          endX: nextValue,
          scaleValues: vals,
          gap: merged.gap,
          dataLength: data().length,
        }),
      );
    }
  };

  const handleSlideMove = (pageX: number): void => {
    const vals = scaleValues();
    if (vals.length === 0) {
      return;
    }
    let delta = pageX - dragStartPageX;
    const sx = startX();
    const ex = endX();
    if (delta > 0) {
      delta = Math.min(
        delta,
        x() + width() - merged.travellerWidth - ex,
        x() + width() - merged.travellerWidth - sx,
      );
    } else if (delta < 0) {
      delta = Math.max(delta, x() - sx, x() - ex);
    }
    const nextStartX = sx + delta;
    const nextEndX = ex + delta;
    setOverrideStartX(nextStartX);
    setOverrideEndX(nextEndX);
    dragStartPageX = pageX;
    onChange(
      getIndex({
        startX: nextStartX,
        endX: nextEndX,
        scaleValues: vals,
        gap: merged.gap,
        dataLength: data().length,
      }),
    );
  };

  const handleWindowMove = (e: MouseEvent | TouchEvent): void => {
    const pageX = getPageX(e);
    if (pageX == null) {
      return;
    }
    if (isTravellerMoving()) {
      handleTravellerMove(pageX);
    } else if (isSlideMoving()) {
      handleSlideMove(pageX);
    }
  };
  const handleWindowUp = (): void => {
    const wasDragging = isTravellerMoving() || isSlideMoving();
    setIsTravellerMoving(false);
    setIsSlideMoving(false);
    detachListeners();
    if (leaveTimer != null) {
      clearTimeout(leaveTimer);
      leaveTimer = undefined;
    }
    if (wasDragging) {
      merged.onDragEnd?.({ startIndex: startIndex(), endIndex: endIndex() });
    }
  };

  // recharts: leaving the brush mid-drag ends the drag after `leaveTimeOut` ms.
  let leaveTimer: ReturnType<typeof setTimeout> | undefined;
  const handleLeaveWrapper = (): void => {
    if (isTravellerMoving() || isSlideMoving()) {
      leaveTimer = setTimeout(handleWindowUp, merged.leaveTimeOut ?? 1000);
    }
  };
  const attachListeners = (): void => {
    window.addEventListener("mousemove", handleWindowMove, true);
    window.addEventListener("mouseup", handleWindowUp, true);
    window.addEventListener("touchmove", handleWindowMove, true);
    window.addEventListener("touchend", handleWindowUp, true);
  };
  const detachListeners = (): void => {
    window.removeEventListener("mousemove", handleWindowMove, true);
    window.removeEventListener("mouseup", handleWindowUp, true);
    window.removeEventListener("touchmove", handleWindowMove, true);
    window.removeEventListener("touchend", handleWindowUp, true);
  };
  onCleanup(detachListeners);

  const startTravellerDrag = (id: BrushTravellerId, e: MouseEvent | TouchEvent): void => {
    const pageX = getPageX(e);
    if (pageX == null) {
      return;
    }
    setIsSlideMoving(false);
    setIsTravellerMoving(true);
    setMovingTravellerId(id);
    dragStartPageX = pageX;
    attachListeners();
  };
  const startSlideDrag = (e: MouseEvent | TouchEvent): void => {
    const pageX = getPageX(e);
    if (pageX == null) {
      return;
    }
    setIsTravellerMoving(false);
    setIsSlideMoving(true);
    dragStartPageX = pageX;
    attachListeners();
  };

  // Keyboard: ArrowLeft/Right moves a focused traveller by one data index, snapping
  // to the next scale tick and dispatching the new window (no overlap with the other).
  const moveTravellerByKeyboard = (direction: -1 | 1, id: BrushTravellerId): void => {
    const vals = scaleValues();
    const cur = id === "startX" ? startIndex() : endIndex();
    if (cur < 0 || cur >= data().length) {
      return;
    }
    const newIndex = cur + direction;
    if (newIndex < 0 || newIndex >= vals.length) {
      return;
    }
    const newScaleValue = vals[newIndex];
    if (newScaleValue == null) {
      return;
    }
    if (
      (id === "startX" && newScaleValue >= endX()) ||
      (id === "endX" && newScaleValue <= startX())
    ) {
      return;
    }
    const nextStartX = id === "startX" ? newScaleValue : startX();
    const nextEndX = id === "endX" ? newScaleValue : endX();
    onChange(
      getIndex({
        startX: nextStartX,
        endX: nextEndX,
        scaleValues: vals,
        gap: merged.gap,
        dataLength: data().length,
      }),
    );
  };

  const onTravellerKeyDown = (id: BrushTravellerId, e: KeyboardEvent): void => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    moveTravellerByKeyboard(e.key === "ArrowRight" ? 1 : -1, id);
  };

  const showText = (): boolean =>
    isTextActive() ||
    isSlideMoving() ||
    isTravellerMoving() ||
    isTravellerFocused() ||
    merged.alwaysShowText;

  const slideX = (): number => Math.min(startX(), endX()) + merged.travellerWidth;
  const slideWidth = (): number => Math.max(Math.abs(endX() - startX()) - merged.travellerWidth, 0);

  const layerClass = (): string =>
    ["recharts-brush", merged.class].filter((c): c is string => Boolean(c)).join(" ");

  const valid = (): boolean =>
    data().length > 0 &&
    isNumber(x()) &&
    isNumber(y()) &&
    isNumber(width()) &&
    isNumber(merged.height) &&
    width() > 0 &&
    merged.height > 0;

  return (
    <Show when={valid()}>
      <Layer
        class={layerClass()}
        style={{ "user-select": "none" }}
        onMouseLeave={handleLeaveWrapper}
      >
        {/* Background */}
        <rect
          stroke={merged.stroke}
          fill={merged.fill}
          x={x()}
          y={y()}
          width={width()}
          height={merged.height}
        />
        {/* Panorama: mirror the brush's children inside the brush rect, in the
            isPanorama context (RootSurface routes them to the brush surface; they
            read the full data range + the brush viewBox). Opt-in via children.
            No ClipPathProvider here: recharts' compact chart has none, so
            useClipPathId inside the panorama falls through to the MAIN chart's
            provider and the DOM keeps a single clipPath (chartDimensions parity). */}
        <Show when={props.children != null}>
          <PanoramaContextProvider>
            <RootSurface otherAttributes={null} title={undefined} desc={undefined}>
              {props.children}
            </RootSurface>
          </PanoramaContextProvider>
        </Show>
        {/* Slide (the selected window) */}
        <rect
          class="recharts-brush-slide"
          onMouseEnter={() => setIsTextActive(true)}
          onMouseLeave={() => setIsTextActive(false)}
          onMouseDown={(e) => startSlideDrag(e)}
          onTouchStart={(e) => startSlideDrag(e)}
          style={{ cursor: "move" }}
          stroke="none"
          fill={merged.stroke}
          fill-opacity={0.2}
          x={slideX()}
          y={y()}
          width={slideWidth()}
          height={merged.height}
        />
        {/* Start traveller */}
        <Layer
          class="recharts-brush-traveller"
          tabIndex={0}
          role="slider"
          aria-label={merged.ariaLabel ?? getAriaLabel(data(), startIndex(), endIndex())}
          aria-valuenow={startX()}
          onMouseEnter={() => setIsTextActive(true)}
          onMouseLeave={() => setIsTextActive(false)}
          onMouseDown={(e) => startTravellerDrag("startX", e)}
          onTouchStart={(e) => startTravellerDrag("startX", e)}
          onKeyDown={(e) => onTravellerKeyDown("startX", e)}
          onFocus={() => setIsTravellerFocused(true)}
          onBlur={() => setIsTravellerFocused(false)}
          style={{ cursor: "col-resize" }}
        >
          <DefaultTraveller
            x={Math.max(startX(), x())}
            y={y()}
            width={merged.travellerWidth}
            height={merged.height}
            stroke={merged.stroke}
          />
        </Layer>
        {/* End traveller */}
        <Layer
          class="recharts-brush-traveller"
          tabIndex={0}
          role="slider"
          aria-label={merged.ariaLabel ?? getAriaLabel(data(), startIndex(), endIndex())}
          aria-valuenow={endX()}
          onMouseEnter={() => setIsTextActive(true)}
          onMouseLeave={() => setIsTextActive(false)}
          onMouseDown={(e) => startTravellerDrag("endX", e)}
          onTouchStart={(e) => startTravellerDrag("endX", e)}
          onKeyDown={(e) => onTravellerKeyDown("endX", e)}
          onFocus={() => setIsTravellerFocused(true)}
          onBlur={() => setIsTravellerFocused(false)}
          style={{ cursor: "col-resize" }}
        >
          <DefaultTraveller
            x={Math.max(endX(), x())}
            y={y()}
            width={merged.travellerWidth}
            height={merged.height}
            stroke={merged.stroke}
          />
        </Layer>
        {/* Start/end text */}
        <Show when={showText()}>
          <Layer class="recharts-brush-texts">
            <Text
              textAnchor="end"
              verticalAnchor="middle"
              x={Math.min(startX(), endX()) - 5}
              y={y() + merged.height / 2}
              fill={merged.stroke}
            >
              {String(getTextOfTick(data(), startIndex(), merged.dataKey, merged.tickFormatter))}
            </Text>
            <Text
              textAnchor="start"
              verticalAnchor="middle"
              x={Math.max(startX(), endX()) + merged.travellerWidth + 5}
              y={y() + merged.height / 2}
              fill={merged.stroke}
            >
              {String(getTextOfTick(data(), endIndex(), merged.dataKey, merged.tickFormatter))}
            </Text>
          </Layer>
        </Show>
      </Layer>
    </Show>
  );
};
