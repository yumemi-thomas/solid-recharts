// Ported from recharts 3.8.1 src/component/LabelList.tsx (commit 7a23854).
//
// CARTESIAN path: renders one <Label> per data point from a context that the
// graphical item (Bar/Line/Area/Scatter) provides — a list of
// CartesianLabelListEntry (each carries the point's trapezoid viewBox + value).
//
// Solid deviations / DEFERRALS (documented):
//  - POLAR context (PolarLabelListContext) DEFERRED to the polar vertical.
//  - context value carries an `Accessor<...entries>` (Solid context is fixed at
//    provide-time; the accessor keeps the per-render entries reactive).
//  - element `content` (React.cloneElement) DROPPED; function `content` kept.
//  - ZIndexLayer / `fill`-passthrough deferred (Label forwards no per-label fill).
import { createContext, createMemo, For, omit, useContext } from "solid-js";
import type { Accessor } from "solid-js";
import type { JSX } from "@solidjs/web";
import {
  type LabelContentType,
  type LabelFormatter,
  type LabelPosition,
  Label,
  isLabelContentAFunction,
} from "./Label";
import { Layer } from "../container/Layer";
import { svgPropertiesAndEvents } from "../util/svgPropertiesAndEvents";
import { getValueByDataKey } from "../util/ChartUtils";
import { CartesianViewBoxRequired, DataKey, TrapezoidViewBox } from "../util/types";
import { isNullish, isNumOrStr } from "../util/DataUtils";
import { isRenderableText, type RenderableText } from "./Text";

export interface LabelListEntry {
  /** What renders as the label content; if undefined, pulled from payload via dataKey. */
  value: unknown;
  /** The source data object for this entry. */
  payload: unknown;
  fill: string | undefined;
}

/**
 * The viewBox properties are repeated as root props of the entry, so reading
 * `entry.x` or `entry.viewBox.x` is equivalent (kept for backward compatibility).
 */
export interface CartesianLabelListEntry extends LabelListEntry, TrapezoidViewBox {
  /** The bounding box of the graphical element this label attaches to (e.g. one Bar). */
  viewBox: TrapezoidViewBox;
  parentViewBox?: CartesianViewBoxRequired;
}

interface LabelListProps {
  id?: string;
  /** Class applied to each rendered label (recharts `className`); spread onto Label. */
  class?: string;
  /** Accessor to get each label's value. Ignored if `dataKey` is specified. */
  valueAccessor?: (entry: CartesianLabelListEntry, index: number) => RenderableText;
  /** How to extract each label's value from the data (overrides valueAccessor). */
  dataKey?: DataKey<unknown>;
  /** A render function for custom label content (element form deferred). */
  content?: LabelContentType;
  textBreakAll?: boolean;
  /** The position of label relative to the view box. */
  position?: LabelPosition;
  /** The offset to the specified "position". */
  offset?: number;
  /** Text rotation angle in degrees. @defaultValue 0 */
  angle?: number;
  /** Customize how content is serialized before rendering (returns renderable text). */
  formatter?: LabelFormatter;
}

export type Props = Omit<JSX.TextSVGAttributes<SVGTextElement>, "children" | "class"> &
  LabelListProps;

/**
 * The type accepted for the `label` prop on graphical items:
 * - boolean: show/hide labels
 * - function: used as `<Label content={fn} />` (called once per data point)
 * - object: props passed to a LabelList
 *
 * @inline
 */
export type ImplicitLabelListType = boolean | LabelContentType | Props;

const defaultAccessor = (entry: LabelListEntry): RenderableText => {
  const raw = entry.value;
  // Range values arrive as arrays; the label shows the last element. Array.isArray
  // widens `unknown` to `any[]`, so the indexed read is `any` — narrowed straight
  // back by isRenderableText below.
  // eslint-disable-next-line typescript/no-unsafe-assignment
  const val: unknown = Array.isArray(raw) ? raw[raw.length - 1] : raw;
  return isRenderableText(val) ? val : undefined;
};

const CartesianLabelListContext = createContext<
  Accessor<ReadonlyArray<CartesianLabelListEntry> | undefined> | undefined
>(undefined);

export function CartesianLabelListContextProvider(props: {
  value: Accessor<ReadonlyArray<CartesianLabelListEntry> | undefined>;
  children: JSX.Element;
}): JSX.Element {
  return (
    <CartesianLabelListContext value={props.value}>{props.children}</CartesianLabelListContext>
  );
}

/**
 * Renders a list of cartesian labels, one per entry provided by the surrounding
 * CartesianLabelListContext (set by the graphical item).
 *
 * @consumes CartesianLabelListContext
 */
export function LabelList(props: Props): JSX.Element {
  const data = useContext(CartesianLabelListContext);
  const entries = createMemo(() => {
    const list = data?.();
    return list != null && list.length > 0 ? list : undefined;
  });
  const others = omit(
    props,
    "valueAccessor",
    "dataKey",
    "id",
    "textBreakAll",
    "content",
    "position",
    "offset",
    "angle",
    "formatter",
  );

  const valueOf = (entry: CartesianLabelListEntry, index: number): RenderableText => {
    if (!isNullish(props.dataKey)) {
      const v = getValueByDataKey(entry.payload, props.dataKey);
      return isNumOrStr(v) ? v : undefined;
    }
    return (props.valueAccessor ?? defaultAccessor)(entry, index);
  };

  const listLayer = createMemo(() => {
    const list = entries();
    if (list == null) {
      return null;
    }
    return (
      <Layer class="recharts-label-list">
        <For each={list}>
          {(entry, index) => (
            <Label
              {...svgPropertiesAndEvents({ ...entry })}
              {...others}
              id={isNullish(props.id) ? undefined : `${props.id}-${index()}`}
              {...(props.fill != null || entry.fill != null
                ? { fill: props.fill ?? entry.fill }
                : {})}
              parentViewBox={entry.parentViewBox}
              value={valueOf(entry, index())}
              {...(isNullish(props.position) ? {} : { position: props.position })}
              {...(isNullish(props.offset) ? {} : { offset: props.offset })}
              {...(isNullish(props.angle) ? {} : { angle: props.angle })}
              {...(isNullish(props.formatter) ? {} : { formatter: props.formatter })}
              {...(isNullish(props.content) ? {} : { content: props.content })}
              {...(isNullish(props.textBreakAll) ? {} : { textBreakAll: props.textBreakAll })}
              viewBox={entry.viewBox}
              index={index()}
              zIndex={0}
            />
          )}
        </For>
      </Layer>
    );
  });

  return <>{listLayer()}</>;
}

LabelList.displayName = "LabelList";

function isLabelPropsObject(
  label: ImplicitLabelListType,
): label is Props & { dataKey?: DataKey<unknown> } {
  if (typeof label !== "object" || label === null || isLabelContentAFunction(label)) {
    return false;
  }
  return (
    "fill" in label ||
    "position" in label ||
    "class" in label ||
    "formatter" in label ||
    "offset" in label ||
    "content" in label ||
    "dataKey" in label
  );
}

/**
 * Renders a LabelList from the implicit `label` prop of a graphical item.
 */
export function LabelListFromLabelProp(props: { label?: ImplicitLabelListType }): JSX.Element {
  const implicitList = createMemo(() => {
    const labelValue = props.label;
    if (!labelValue) {
      return null;
    }
    if (labelValue === true) {
      return <LabelList />;
    }
    if (isLabelContentAFunction(labelValue)) {
      return <LabelList content={labelValue} />;
    }
    if (typeof labelValue === "object" && labelValue !== null) {
      if (isLabelPropsObject(labelValue)) {
        return <LabelList {...labelValue} />;
      }
    }
    return null;
  });

  return <>{implicitList()}</>;
}
