/**
 * @fileOverview Symbols
 *
 * Ported from recharts 3.8.1 src/shape/Symbols.tsx (commit 7a23854).
 * Pure d3-shape symbol math copied verbatim. Solid deviations: `className` →
 * `class` (Omit the wide SVG `class`); destructuring defaults → `?? default`
 * accessors; `clsx` → `class={[...]}`; `return null` → `<Show>`; the
 * `registerSymbol` static is attached via `Object.assign` (no `as`).
 */
import { type CamelSvgProps } from "../util/svgPropertiesNoEvents";
import { Show, omit } from "solid-js";
import type { JSX } from "@solidjs/web";
import {
  symbol as shapeSymbol,
  symbolCircle,
  symbolCross,
  symbolDiamond,
  symbolSquare,
  symbolStar,
  symbolTriangle,
  symbolWye,
  type SymbolType as D3SymbolType,
} from "d3-shape";
import { SymbolType } from "../util/types";
import { isNumber, upperFirst } from "../util/DataUtils";
import { svgPropertiesAndEvents } from "../util/svgPropertiesAndEvents";

type SizeType = "area" | "diameter";

interface SymbolFactory {
  [type: string]: D3SymbolType;
}

const symbolFactories: SymbolFactory = {
  symbolCircle,
  symbolCross,
  symbolDiamond,
  symbolSquare,
  symbolStar,
  symbolTriangle,
  symbolWye,
};
const RADIAN = Math.PI / 180;

const getSymbolFactory = (type: SymbolType): D3SymbolType => {
  const name = `symbol${upperFirst(type)}`;

  return symbolFactories[name] || symbolCircle;
};

const calculateAreaSize = (size: number, sizeType: SizeType, type: SymbolType): number => {
  if (sizeType === "area") {
    return size;
  }

  switch (type) {
    case "cross":
      return (5 * size * size) / 9;
    case "diamond":
      return (0.5 * size * size) / Math.sqrt(3);
    case "square":
      return size * size;
    case "star": {
      const angle = 18 * RADIAN;

      return 1.25 * size * size * (Math.tan(angle) - Math.tan(angle * 2) * Math.tan(angle) ** 2);
    }
    case "triangle":
      return (Math.sqrt(3) * size * size) / 4;
    case "wye":
      return ((21 - 10 * Math.sqrt(3)) * size * size) / 8;
    default:
      return (Math.PI * size * size) / 4;
  }
};

export interface InnerSymbolsProp {
  class?: string;
  type?: SymbolType;
  cx?: number;
  cy?: number;
  width?: number;
  height?: number;
  size?: number;
  sizeType?: SizeType;
  /** A data row's `name` rides through onto the symbol (recharts spreads `...entry`). */
  name?: string | number;
}

export type SymbolsProps = Omit<
  CamelSvgProps<JSX.PathSVGAttributes<SVGPathElement>>,
  "type" | "class"
> &
  InnerSymbolsProp;

const registerSymbol = (key: string, factory: D3SymbolType): void => {
  symbolFactories[`symbol${upperFirst(key)}`] = factory;
};

/**
 * Renders a symbol from a set of predefined shapes.
 */
const SymbolsComponent = (props: SymbolsProps): JSX.Element => {
  const type = (): SymbolType => props.type ?? "circle";
  const size = (): number => props.size ?? 64;
  const sizeType = (): SizeType => props.sizeType ?? "area";

  // Runtime guard: despite the type, `type` can be anything at runtime
  // (https://github.com/recharts/recharts/issues/6197); fall back to 'circle'.
  const realType = (): SymbolType => (typeof type() === "string" ? type() : "circle");

  const getPath = (): string | undefined => {
    const symbolFactory = getSymbolFactory(realType());
    const symbol = shapeSymbol()
      .type(symbolFactory)
      .size(calculateAreaSize(size(), sizeType(), realType()));

    const s = symbol();
    if (s === null) {
      return undefined;
    }
    return s;
  };

  const passthrough = (): Record<string, unknown> => ({
    ...omit(props, "class", "type", "size", "sizeType"),
    type: type(),
    size: size(),
    sizeType: sizeType(),
  });

  return (
    <Show when={isNumber(props.cx) && isNumber(props.cy) && isNumber(size())}>
      <path
        {...svgPropertiesAndEvents(passthrough())}
        class={["recharts-symbols", props.class]}
        transform={`translate(${props.cx}, ${props.cy})`}
        d={getPath()}
      />
    </Show>
  );
};

export const Symbols = Object.assign(SymbolsComponent, { registerSymbol });
