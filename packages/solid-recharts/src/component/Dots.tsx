// Ported from recharts 3.8.1 src/component/Dots.tsx (commit 7a23854).
//
// Solid deviations:
//   - `ReactUtils.isClipDot` (React-divergent) → an inline Solid prop check.
//   - `cloneElement`/`isValidElement` element path is dropped — custom dots are
//     render functions in Solid; a props-object dot has its SVG attrs merged into
//     the default <Dot> (recharts does this via svgPropertiesAndEventsFromUnknown).
//   - `ZIndexLayer` wrapper deferred (zIndex layering not ported) → plain <Layer>.
//   - `clsx` → class string composed inline; `className` → `class`.
import { createMemo, For, omit, Show } from "solid-js";
import type { JSX } from "@solidjs/web";
import { Dot, type DotProps } from "../shape/Dot";
import { Layer } from "../container/Layer";
import { DataKey, DotItemDotProps, DotPoint, DotType } from "../util/types";

/** Solid-idiomatic replacement for ReactUtils.isClipDot. */
export function isClipDot(dot: DotType): boolean {
  if (dot && typeof dot === "object" && "clipDot" in dot) {
    return Boolean(dot.clipDot);
  }
  return true;
}

function shouldRenderDots(points: ReadonlyArray<DotPoint> | undefined, dot: DotType): boolean {
  if (points == null) {
    return false;
  }
  if (dot) {
    return true;
  }
  return points.length === 1;
}

export type DotsDotProps = Omit<DotProps, "cx" | "cy" | "index" | "dataKey" | "value" | "payload">;

export interface DotsProps {
  /** Points to render dots for. */
  points: ReadonlyArray<DotPoint>;
  /** Dot configuration — boolean, render function, or props object. */
  dot: DotType;
  /** Class for the dots layer (e.g. 'recharts-line-dots'). */
  class: string;
  /** Class for each individual dot (e.g. 'recharts-line-dot'). */
  dotClass: string;
  dataKey: DataKey<unknown> | undefined;
  /** Base props spread onto each dot (from the parent line/area). */
  baseProps: DotsDotProps;
  needClip?: boolean;
  clipPathId?: string;
}

interface DotRendererProps {
  entry: DotPoint;
  index: number;
  dot: DotType;
  baseProps: DotsDotProps;
  dataKey: DataKey<unknown> | undefined;
  dotClass: string;
  points: ReadonlyArray<DotPoint>;
}

// Renders one dot. Built as a component (invoked from the <For> JSX) so every
// `props.*` read happens in a tracking scope — building the props in the <For>
// callback body would fire STRICT_READ_UNTRACKED.
//
// Deferred: merging a props-object dot's own SVG attrs (recharts'
// svgPropertiesAndEventsFromUnknown(dot) is `unknown`-valued, can't spread onto
// the typed <Dot>). Custom dots in Solid are render functions (they receive the
// full dotProps); a boolean/props-object dot renders the default <Dot> styled
// from the line's `baseProps`.
function DotRenderer(props: DotRendererProps): JSX.Element {
  const dotProps = createMemo<DotItemDotProps>(() => ({
    r: 3,
    ...props.baseProps,
    index: props.index,
    cx: props.entry.x ?? undefined,
    cy: props.entry.y ?? undefined,
    dataKey: props.dataKey,
    value: props.entry.value,
    payload: props.entry.payload,
    points: props.points,
  }));

  // A function dot is a render prop; boolean/props-object dots fall back to the
  // default <Dot>. A plain ternary (not <Show when={fn}>) keeps the read tracked
  // without tripping STRICT_READ on the function-valued condition.
  const renderFn = createMemo(() => (typeof props.dot === "function" ? props.dot : undefined));

  return (
    <>
      {renderFn() ? (
        renderFn()?.(dotProps())
      ) : (
        <Dot
          {...omit(dotProps(), "index", "dataKey", "value", "payload", "points")}
          class={props.dotClass}
        />
      )}
    </>
  );
}

export function Dots(props: DotsProps): JSX.Element {
  const layerClip = (): string | undefined =>
    props.needClip && props.clipPathId != null
      ? `url(#clipPath-${isClipDot(props.dot) ? "" : "dots-"}${props.clipPathId})`
      : undefined;

  return (
    <Show when={shouldRenderDots(props.points, props.dot)}>
      <Layer class={props.class} clipPath={layerClip()}>
        {/* keyed={false} (index-keyed): during animation `points` is a fresh
            array with fresh point objects every frame; reference-keyed <For>
            would dispose+recreate every dot's DOM node per frame. Index-keying
            reuses the rows and only updates cx/cy reactively. */}
        <For each={props.points} keyed={false}>
          {(entry, i) => (
            <DotRenderer
              entry={entry()}
              index={i}
              dot={props.dot}
              baseProps={props.baseProps}
              dataKey={props.dataKey}
              dotClass={props.dotClass}
              points={props.points}
            />
          )}
        </For>
      </Layer>
    </Show>
  );
}
