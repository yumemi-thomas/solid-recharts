// Ported from recharts 3.8.1 src/component/Label.tsx (commit 7a23854).
//
// Cartesian + polar label positioning. Solid deviations / DEFERRALS (documented):
//  - POLAR path: PolarLabelContext / usePolarLabelContext / getAttrsOfPolarLabel
//    are ported (string/value/object/function labels positioned against a polar
//    viewBox; falls back to the chart's selectPolarViewBox). recharts'
//    polarViewBoxToTrapezoid bridge for cartesian-position labels inside a polar
//    box is not ported (charts don't need it).
//  - resolveDefaultProps → `merge`; `clsx` → `class` array.
//  - element `content` (React.cloneElement) DROPPED — Solid has no cloneElement;
//    the function-`content` render form and the value/children text form are kept.
//  - ZIndexLayer wrapper and `labelRef` are deferred (render <Text> directly).
//  - per-label SVG styling passthrough (fill/style/font-*) is deferred — Solid's
//    wide attribute value type (RemoveAttribute) doesn't narrow cleanly into
//    Text's string props; Label forwards position + anchors + angle + class only.
//  - context value carries an `Accessor<TrapezoidViewBox>` (Solid context is fixed
//    at provide-time; the accessor keeps the box reactive).
import { type CamelSvgProps } from "../util/svgPropertiesNoEvents";
import { createContext, createMemo, merge, omit, Show, useContext } from "solid-js";
import type { Accessor } from "solid-js";
import type { JSX } from "@solidjs/web";
import { type RenderableText, Text } from "./Text";
import { useUniqueId } from "../util/useUniqueId";
import { isNullish, isNumber, isNumOrStr } from "../util/DataUtils";
import {
  CartesianViewBoxRequired,
  DataKey,
  PolarViewBoxRequired,
  TrapezoidViewBox,
  ViewBox,
} from "../util/types";
import { cartesianViewBoxToTrapezoid, useViewBox } from "../context/chartLayoutContext";
import { useAppSelector } from "../state/hooks";
import { selectPolarViewBox } from "../state/selectors/polarAxisSelectors";
import { polarToCartesian } from "../util/PolarUtils";
import {
  type CartesianLabelPosition,
  getCartesianPosition,
} from "../cartesian/getCartesianPosition";
import { svgPropertiesAndEvents } from "../util/svgPropertiesAndEvents";
import { DefaultZIndexes } from "../zIndex/DefaultZIndexes";
import { ZIndexLayer } from "../zIndex/ZIndexLayer";

/** @inline */
export type LabelContentType = (props: Props) => RenderableText | JSX.Element;

type PolarLabelPosition = "insideStart" | "insideEnd" | "end";

/** @inline */
export type LabelPosition = CartesianLabelPosition | PolarLabelPosition;

/** @inline */
export type LabelFormatter = (label: RenderableText) => RenderableText;

interface LabelProps {
  /** The box of viewing area. Used for positioning; falls back to context. */
  viewBox?: ViewBox | TrapezoidViewBox;
  parentViewBox?: CartesianViewBoxRequired | PolarViewBoxRequired;
  /** Customize how content is serialized before rendering (returns renderable text). */
  formatter?: LabelFormatter;
  /** The label value; can also be set via children. */
  value?: RenderableText;
  /** The offset to the specified "position". @defaultValue 5 */
  offset?: number;
  /** The position of label relative to the view box. @defaultValue 'middle' */
  position?: LabelPosition;
  /** The label value; can also be set via the `value` prop. */
  children?: RenderableText;
  class?: string;
  /** A render function for custom label content (element form is N/A — no cloneElement). */
  content?: LabelContentType;
  /** @defaultValue false */
  textBreakAll?: boolean;
  /** Text rotation angle in degrees. @defaultValue 0 */
  angle?: number;
  index?: number;
  /** HTML id attribute. */
  id?: string;
  /** @defaultValue 0 — LabelList passes 0 so labels stay in the bar layer. */
  zIndex?: number;
}

export type Props = Omit<
  CamelSvgProps<JSX.TextSVGAttributes<SVGTextElement>>,
  "viewBox" | "class" | "children"
> &
  LabelProps;

export type ImplicitLabelType =
  | boolean
  | string
  | number
  | LabelContentType
  // dataKey is only applicable when label is used implicitly from graphical element props
  | (Props & { dataKey?: DataKey<unknown> });

// ---- Cartesian label context ------------------------------------------------

const CartesianLabelContext = createContext<Accessor<TrapezoidViewBox> | null>(null);

export function CartesianLabelContextProvider(
  props: TrapezoidViewBox & { children: JSX.Element },
): JSX.Element {
  const viewBox = createMemo<TrapezoidViewBox>(() => ({
    x: props.x,
    y: props.y,
    upperWidth: props.upperWidth,
    lowerWidth: props.lowerWidth,
    width: props.width,
    height: props.height,
  }));
  return <CartesianLabelContext value={viewBox}>{props.children}</CartesianLabelContext>;
}

export function useCartesianLabelContext(): Accessor<TrapezoidViewBox | undefined> {
  const labelChildContext = useContext(CartesianLabelContext);
  const chartViewBox = useViewBox();
  return () => {
    const child = labelChildContext?.();
    if (child != null) {
      return child;
    }
    const cb = chartViewBox();
    return cb ? cartesianViewBoxToTrapezoid(cb) : undefined;
  };
}

// ---- Polar label context ----------------------------------------------------

const PolarLabelContext = createContext<Accessor<PolarViewBoxRequired> | null>(null);

export function PolarLabelContextProvider(
  props: PolarViewBoxRequired & { children: JSX.Element },
): JSX.Element {
  const viewBox = createMemo<PolarViewBoxRequired>(() => ({
    cx: props.cx,
    cy: props.cy,
    innerRadius: props.innerRadius,
    outerRadius: props.outerRadius,
    startAngle: props.startAngle,
    endAngle: props.endAngle,
    clockWise: props.clockWise,
  }));
  return <PolarLabelContext value={viewBox}>{props.children}</PolarLabelContext>;
}

export function usePolarLabelContext(): Accessor<PolarViewBoxRequired | undefined> {
  const labelChildContext = useContext(PolarLabelContext);
  const chartPolarViewBox = useAppSelector(selectPolarViewBox);
  return () => labelChildContext?.() ?? chartPolarViewBox();
}

const isPolarViewBox = (
  viewBox: ViewBox | TrapezoidViewBox | undefined,
): viewBox is PolarViewBoxRequired => viewBox != null && "cx" in viewBox && isNumber(viewBox.cx);

type PolarLabelAttrs = {
  x: number;
  y: number;
  textAnchor: "start" | "middle" | "end";
  verticalAnchor: "start" | "middle" | "end";
};

/** Position attributes for a label placed against a polar viewBox. Ported from recharts. */
const getAttrsOfPolarLabel = (
  viewBox: PolarViewBoxRequired,
  offset: number,
  position: LabelPosition | undefined,
): PolarLabelAttrs => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle } = viewBox;
  const midAngle = (startAngle + endAngle) / 2;

  if (position === "outside") {
    const { x, y } = polarToCartesian(cx, cy, outerRadius + offset, midAngle);
    return { x, y, textAnchor: x >= cx ? "start" : "end", verticalAnchor: "middle" };
  }
  if (position === "center") {
    return { x: cx, y: cy, textAnchor: "middle", verticalAnchor: "middle" };
  }
  if (position === "centerTop") {
    return { x: cx, y: cy, textAnchor: "middle", verticalAnchor: "start" };
  }
  if (position === "centerBottom") {
    return { x: cx, y: cy, textAnchor: "middle", verticalAnchor: "end" };
  }
  const r = (innerRadius + outerRadius) / 2;
  const { x, y } = polarToCartesian(cx, cy, r, midAngle);
  return { x, y, textAnchor: "middle", verticalAnchor: "middle" };
};

// ---- helpers ----------------------------------------------------------------

const getLabel = (props: Props): RenderableText => {
  const label: RenderableText = isNullish(props.children) ? props.value : props.children;
  if (typeof props.formatter === "function") {
    return props.formatter(label);
  }
  return label;
};

export const isLabelContentAFunction = (content: unknown): content is LabelContentType =>
  content != null && typeof content === "function";

export const defaultLabelProps = {
  angle: 0,
  offset: 5,
  zIndex: DefaultZIndexes.label,
  position: "middle",
  textBreakAll: false,
} as const satisfies Partial<Props>;

const getDeltaAngle = (startAngle: number, endAngle: number): number => {
  const sign = Math.sign(endAngle - startAngle);
  const deltaAngle = Math.min(Math.abs(endAngle - startAngle), 360);
  return sign * deltaAngle;
};

/**
 * Renders a single label positioned in the cartesian coordinate system, using
 * the viewBox from props or the nearest CartesianLabelContext / chart viewBox.
 *
 * @consumes CartesianViewBoxContext
 * @consumes CartesianLabelContext
 */
export function Label(outerProps: Props): JSX.Element {
  const props = merge(defaultLabelProps, outerProps);
  const cartesianViewBox = useCartesianLabelContext();
  const polarLabelContext = usePolarLabelContext();
  const generatedRadialPathId = useUniqueId("recharts-radial-line");
  const radialPathId = createMemo(() => props.id || generatedRadialPathId);

  // A polar viewBox wins when supplied via props or the surrounding polar context;
  // otherwise the label is positioned in the cartesian system (the common path).
  const polarViewBox = createMemo<PolarViewBoxRequired | undefined>(() => {
    const fromProps = props.viewBox;
    if (isPolarViewBox(fromProps)) {
      return fromProps;
    }
    return fromProps == null ? polarLabelContext() : undefined;
  });

  const viewBox = createMemo<TrapezoidViewBox | undefined>(() => {
    if (polarViewBox() != null) {
      return undefined;
    }
    const fromProps = props.viewBox;
    if (fromProps == null) {
      return cartesianViewBox();
    }
    return isPolarViewBox(fromProps) ? cartesianViewBox() : cartesianViewBoxToTrapezoid(fromProps);
  });

  const textSvgProps = createMemo(() =>
    svgPropertiesAndEvents(
      omit(
        props,
        "content",
        "viewBox",
        "parentViewBox",
        "formatter",
        "value",
        "children",
        "position",
        "offset",
        "angle",
        "textBreakAll",
        "index",
        "id",
        "class",
      ),
    ),
  );

  // Plain-data memo for the default text-label path (null when there's nothing
  // to render, or when custom `content` takes over below). Props are read here
  // so the <Show> child only consumes the narrowed accessor (Solid 2).
  const textRender = createMemo(() => {
    const vb = viewBox();
    if (vb == null || typeof props.content === "function") {
      return null;
    }
    if (isNullish(props.value) && isNullish(props.children)) {
      return null;
    }
    // The Cartesian position helper only uses a Cartesian parentViewBox; a polar
    // entry's parentViewBox (carrying `cx`) is irrelevant in this branch.
    const parentViewBox =
      props.parentViewBox != null && "cx" in props.parentViewBox ? undefined : props.parentViewBox;
    const pos = getCartesianPosition({
      viewBox: vb,
      position: props.position,
      offset: props.offset,
      parentViewBox,
      clamp: true,
    });
    const svgProps: Record<string, unknown> = {
      ...textSvgProps(),
      ...(props.offset != null ? { offset: String(props.offset) } : {}),
      ...(pos.width != null ? { width: String(pos.width) } : {}),
      ...(pos.height != null ? { height: String(pos.height) } : {}),
    };
    return {
      label: getLabel(props),
      pos,
      class: props.class != null && props.class !== "" ? props.class : "recharts-label",
      angle: props.angle,
      breakAll: props.textBreakAll,
      svgProps,
    };
  });

  // Polar positioning (used by polar axis/Pie labels).
  const polarTextRender = createMemo(() => {
    const pvb = polarViewBox();
    if (pvb == null || typeof props.content === "function") {
      return null;
    }
    if (isNullish(props.value) && isNullish(props.children)) {
      return null;
    }
    return {
      label: getLabel(props),
      attrs: getAttrsOfPolarLabel(pvb, props.offset, props.position),
      class: props.class != null && props.class !== "" ? props.class : "recharts-label",
      angle: props.angle,
      breakAll: props.textBreakAll,
    };
  });

  const radialTextRender = createMemo(() => {
    const pvb = polarViewBox();
    if (pvb == null || typeof props.content === "function") {
      return null;
    }
    if (
      props.position !== "insideStart" &&
      props.position !== "insideEnd" &&
      props.position !== "end"
    ) {
      return null;
    }
    if (isNullish(props.value) && isNullish(props.children)) {
      return null;
    }

    const radius = (pvb.innerRadius + pvb.outerRadius) / 2;
    const deltaAngle = getDeltaAngle(pvb.startAngle, pvb.endAngle);
    const sign = deltaAngle >= 0 ? 1 : -1;
    let labelAngle: number;
    let direction: boolean;

    if (props.position === "insideStart") {
      labelAngle = pvb.startAngle + sign * props.offset;
      direction = pvb.clockWise;
    } else if (props.position === "insideEnd") {
      labelAngle = pvb.endAngle - sign * props.offset;
      direction = !pvb.clockWise;
    } else {
      labelAngle = pvb.endAngle + sign * props.offset;
      direction = pvb.clockWise;
    }

    direction = deltaAngle <= 0 ? direction : !direction;
    const startPoint = polarToCartesian(pvb.cx, pvb.cy, radius, labelAngle);
    const endPoint = polarToCartesian(
      pvb.cx,
      pvb.cy,
      radius,
      labelAngle + (direction ? 1 : -1) * 359,
    );

    return {
      label: getLabel(props),
      path: `M${startPoint.x},${startPoint.y}\n    A${radius},${radius},0,1,${direction ? 0 : 1},\n    ${endPoint.x},${endPoint.y}`,
    };
  });

  // Custom content render-prop. Compute its args as DATA (the function + the props it
  // receives); the <Show> below invokes it inline so this memo never returns JSX.
  // (Element-form `content` is N/A by design — Solid has no cloneElement.)
  const customLabel = createMemo(() => {
    // recharts: a `position="center"` label resolves against the CARTESIAN viewBox
    // even inside a polar chart (PieChart center label), otherwise polar wins.
    const vb =
      props.position === "center"
        ? (viewBox() ?? cartesianViewBox())
        : (polarViewBox() ?? viewBox() ?? cartesianViewBox());
    const content = props.content;
    if (vb == null || typeof content !== "function") {
      return undefined;
    }
    return { content, args: omit({ ...props, viewBox: vb }, "content") };
  });

  // Render the default/polar/radial text labels inline under <Show> (their render
  // data is computed by the *Render memos above; these branches only project it to
  // JSX). Returning JSX from a memo and feeding it into <ZIndexLayer> (a Portal)
  // leaks ownerless render-effects on recompute — see Bar.tsx. A non-keyed <Show>
  // keeps each subtree stable and reads the narrowed accessor inside JSX (tracked).
  return (
    <>
      <Show when={textRender()}>
        {(d) => (
          <ZIndexLayer zIndex={props.zIndex}>
            <Text
              {...d().svgProps}
              class={d().class}
              x={d().pos.x}
              y={d().pos.y}
              textAnchor={d().pos.horizontalAnchor}
              verticalAnchor={d().pos.verticalAnchor}
              angle={d().angle}
              breakAll={d().breakAll}
            >
              {d().label}
            </Text>
          </ZIndexLayer>
        )}
      </Show>
      <Show when={polarTextRender()}>
        {(d) => (
          <ZIndexLayer zIndex={props.zIndex}>
            <Text
              {...textSvgProps()}
              class={d().class}
              x={d().attrs.x}
              y={d().attrs.y}
              textAnchor={d().attrs.textAnchor}
              verticalAnchor={d().attrs.verticalAnchor}
              angle={d().angle}
              breakAll={d().breakAll}
            >
              {d().label}
            </Text>
          </ZIndexLayer>
        )}
      </Show>
      <Show when={radialTextRender()}>
        {(d) => (
          <ZIndexLayer zIndex={props.zIndex}>
            <text
              {...textSvgProps()}
              dominant-baseline="central"
              class={["recharts-radial-bar-label", props.class]}
            >
              <defs>
                <path id={radialPathId()} d={d().path} />
              </defs>
              <textPath href={`#${radialPathId()}`}>{d().label}</textPath>
            </text>
          </ZIndexLayer>
        )}
      </Show>
      <Show when={customLabel()}>{(c) => <>{c().content(c().args)}</>}</Show>
    </>
  );
}

Label.displayName = "Label";

// ---- implicit label parsing -------------------------------------------------

function parseLabel(
  label: ImplicitLabelType | undefined,
  viewBox: TrapezoidViewBox | PolarViewBoxRequired | undefined,
): JSX.Element {
  if (!label) {
    return null;
  }
  if (label === true) {
    return <Label viewBox={viewBox} />;
  }
  if (isNumOrStr(label)) {
    return <Label value={label} viewBox={viewBox} />;
  }
  if (isLabelContentAFunction(label)) {
    return <Label content={label} viewBox={viewBox} />;
  }
  if (typeof label === "object") {
    return <Label {...label} viewBox={viewBox} />;
  }
  return null;
}

/**
 * Renders a Label from the implicit `label` prop of a graphical/reference
 * element, reading the viewBox from the surrounding CartesianLabelContext.
 */
export function CartesianLabelFromLabelProp(props: {
  label: ImplicitLabelType | undefined;
}): JSX.Element {
  const viewBox = useCartesianLabelContext();
  const label = createMemo(() => parseLabel(props.label, viewBox()));
  return <>{label()}</>;
}

/**
 * Renders a Label from the implicit `label` prop of a polar axis, reading the
 * viewBox from the surrounding PolarLabelContext (or the chart's polar viewBox).
 */
export function PolarLabelFromLabelProp(props: {
  label: ImplicitLabelType | undefined;
}): JSX.Element {
  const viewBox = usePolarLabelContext();
  const label = createMemo(() => parseLabel(props.label, viewBox()));
  return <>{label()}</>;
}
