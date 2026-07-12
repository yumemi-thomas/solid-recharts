// Ported from recharts 3.8.1 src/container/RootSurface.tsx (commit 7a23854).
//
// Solid deviations: `forwardRef` → `ref` prop; chart-dimension/accessibility
// hooks return Accessors → call them; `return null` → keyed `<Show>` (which also
// narrows width/height to numbers without a non-null `!`).
import { Show } from "solid-js";
import type { JSX } from "@solidjs/web";
import { useChartHeight, useChartWidth } from "../context/chartLayoutContext";
import { useAccessibilityLayer } from "../context/accessibilityContext";
import { useIsPanorama } from "../context/PanoramaContext";
import { Surface } from "./Surface";
import { useAppSelector } from "../state/hooks";
import { selectBrushDimensions } from "../state/selectors/brushSelectors";
import { isPositiveNumber } from "../util/isWellBehavedNumber";
import { AllZIndexPortals } from "../zIndex/ZIndexPortal";

interface RootSurfaceProps {
  children: JSX.Element;
  title: string | undefined;
  desc: string | undefined;
  otherAttributes: Record<string, unknown> | null;
  ref?: SVGSVGElement | ((el: SVGSVGElement) => void);
}

const FULL_WIDTH_AND_HEIGHT = {
  width: "100%",
  height: "100%",
  // display: block avoids the inline-SVG descender gap that otherwise grows a
  // responsive container indefinitely.
  display: "block",
};

const MainChartSurface = (props: RootSurfaceProps): JSX.Element => {
  const width = useChartWidth();
  const height = useChartHeight();
  const hasAccessibilityLayer = useAccessibilityLayer();

  const dims = (): { width: number; height: number } | undefined => {
    const w = width();
    const h = height();
    return isPositiveNumber(w) && isPositiveNumber(h) ? { width: w, height: h } : undefined;
  };

  const tabIndex = (): number | undefined => {
    const other = props.otherAttributes;
    if (other == null) {
      return undefined;
    }
    // The chart-prop record keeps recharts' camelCase keys (KeepCase filter);
    // Surface renames to DOM attribute names when it renders.
    const explicit = other.tabIndex;
    return typeof explicit === "number" ? explicit : hasAccessibilityLayer() ? 0 : undefined;
  };
  const role = (): string | undefined => {
    const other = props.otherAttributes;
    if (other == null) {
      return undefined;
    }
    return typeof other.role === "string"
      ? other.role
      : hasAccessibilityLayer()
        ? "application"
        : undefined;
  };

  // role/tabindex go through the (loosely-typed) spread, not typed props: Solid's
  // `role` prop is a strict ARIA-literal union that rejects a plain `string`.
  const attrs = (): Record<string, unknown> => ({
    ...(props.otherAttributes ?? {}),
    role: role(),
    tabIndex: tabIndex(),
  });

  // Non-keyed Show: mount the Surface once when dimensions are positive; width/
  // height update reactively. (Keyed would churn the subtree on each size change.)
  return (
    <Show when={dims()}>
      {(d) => (
        <Surface
          {...attrs()}
          title={props.title}
          desc={props.desc}
          width={d().width}
          height={d().height}
          style={FULL_WIDTH_AND_HEIGHT}
          ref={props.ref}
        >
          {props.children}
        </Surface>
      )}
    </Show>
  );
};

const BrushPanoramaSurface = (props: { children: JSX.Element }): JSX.Element => {
  const brushDimensions = useAppSelector(selectBrushDimensions);

  return (
    <Show when={brushDimensions()}>
      {(dims) => (
        <Surface width={dims().width} height={dims().height} x={dims().x} y={dims().y}>
          {props.children}
        </Surface>
      )}
    </Show>
  );
};

export const RootSurface = (props: RootSurfaceProps): JSX.Element => {
  const isPanorama = useIsPanorama();

  if (isPanorama) {
    return (
      <BrushPanoramaSurface>
        <AllZIndexPortals isPanorama>{props.children}</AllZIndexPortals>
      </BrushPanoramaSurface>
    );
  }
  return (
    <MainChartSurface {...props}>
      <AllZIndexPortals isPanorama={false}>{props.children}</AllZIndexPortals>
    </MainChartSurface>
  );
};
