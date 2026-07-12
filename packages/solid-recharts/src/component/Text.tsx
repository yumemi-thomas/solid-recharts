// Ported from recharts 3.8.1 src/component/Text.tsx (commit 7a23854).
//
// The word-measurement/wrapping helpers are pure (getStringSize/reduceCSSCalc/
// Global) and ported verbatim. Solid deviations on the component: forwardRef →
// (ref forwarding deferred — axis tick labels don't need it); useMemo →
// createMemo; resolveDefaultProps → merge; `className`→`class`, clsx → array
// `class`; React CSSProperties → csstype Properties (matches getStringSize); the
// SVG passthrough props go through svgPropertiesAndEvents like the shape ports;
// `React.ReactNode` children → `RenderableText`.
import { type CamelSvgProps } from "../util/svgPropertiesNoEvents";
import { createMemo, For, merge, omit, Show } from "solid-js";
import type { JSX } from "@solidjs/web";
import type { Properties as CSSProperties } from "csstype";
import { isNullish, isNumber, isNumOrStr } from "../util/DataUtils";
import { Global } from "../util/Global";
import { getStringSize } from "../util/DOMUtils";
import { reduceCSSCalc } from "../util/ReduceCSSCalc";
import { svgPropertiesAndEvents } from "../util/svgPropertiesAndEvents";
import { isWellBehavedNumber } from "../util/isWellBehavedNumber";

const BREAKING_SPACES = /[ \f\n\r\t\v\u2028\u2029]+/;

interface Words {
  words: Array<string>;
  width: number | undefined;
}

interface WordsWithWidth {
  words: Array<string>;
  width: number;
}

interface WordWithComputedWidth {
  word: string;
  width: number;
}

interface CalculatedWordWidths {
  wordsWithComputedWidth: Array<WordWithComputedWidth>;
  spaceWidth: number;
}

type CalculateWordWidthsParam = Pick<TextProps, "children" | "breakAll" | "style">;

const calculateWordWidths = ({
  children,
  breakAll,
  style,
}: CalculateWordWidthsParam): CalculatedWordWidths | null => {
  try {
    let words: string[] = [];
    if (!isNullish(children)) {
      if (breakAll) {
        words = children.toString().split("");
      } else {
        words = children.toString().split(BREAKING_SPACES);
      }
    }

    const wordsWithComputedWidth = words.map((word) => ({
      word,
      width: getStringSize(word, style).width,
    }));

    const spaceWidth = breakAll ? 0 : getStringSize(" ", style).width;

    return { wordsWithComputedWidth, spaceWidth };
  } catch {
    return null;
  }
};

export type TextAnchor = "start" | "middle" | "end" | "inherit";

export function isValidTextAnchor(value: string | undefined): value is TextAnchor {
  return value === "start" || value === "middle" || value === "end" || value === "inherit";
}

export type TextVerticalAnchor = "start" | "middle" | "end";

export type RenderableText = string | number | boolean | null | undefined;

export function isRenderableText(val: unknown): val is RenderableText {
  return (
    isNullish(val) || typeof val === "string" || typeof val === "number" || typeof val === "boolean"
  );
}

interface TextProps {
  scaleToFit?: boolean;
  angle?: number;
  textAnchor?: TextAnchor;
  verticalAnchor?: TextVerticalAnchor;
  style?: CSSProperties;
  lineHeight?: number | string;
  capHeight?: number | string;
  breakAll?: boolean;
  children?: RenderableText;
  maxLines?: number;
  width?: number | string;
  height?: number | string;
  offset?: number | string;
  // Narrowed from the broad JSX attribute types so the values flow cleanly into
  // the class array / `fill.includes` check.
  class?: string;
  fill?: string;
}

export type Props = Omit<
  CamelSvgProps<JSX.TextSVGAttributes<SVGTextElement>>,
  "textAnchor" | "verticalAnchor" | "style" | "children" | "class" | "fill"
> &
  TextProps;

type CalculateWordsByLinesProps = Pick<TextProps, "maxLines" | "children" | "style" | "breakAll">;

const calculate = (
  words: ReadonlyArray<WordWithComputedWidth>,
  lineWidth: number | string | undefined,
  spaceWidth: number,
  scaleToFit: boolean,
): ReadonlyArray<WordsWithWidth> =>
  words.reduce((result: Array<WordsWithWidth>, { word, width }) => {
    const currentLine = result[result.length - 1];

    if (
      currentLine &&
      width != null &&
      (lineWidth == null ||
        scaleToFit ||
        currentLine.width + width + spaceWidth < Number(lineWidth))
    ) {
      currentLine.words.push(word);
      currentLine.width += width + spaceWidth;
    } else {
      const newLine: WordsWithWidth = { words: [word], width };
      result.push(newLine);
    }

    return result;
  }, []);

const findLongestLine = (words: ReadonlyArray<WordsWithWidth>): WordsWithWidth =>
  words.reduce((a: WordsWithWidth, b: WordsWithWidth) => (a.width > b.width ? a : b));

const suffix = "…";

const checkOverflow = (
  text: string,
  index: number,
  breakAll: TextProps["breakAll"],
  style: TextProps["style"],
  maxLines: number,
  lineWidth: number | string | undefined,
  spaceWidth: number,
  scaleToFit: boolean,
): [boolean, ReadonlyArray<Words>] => {
  const tempText = text.slice(0, index);

  const words = calculateWordWidths({ breakAll, style, children: tempText + suffix });

  if (!words) {
    return [false, []];
  }

  const result = calculate(words.wordsWithComputedWidth, lineWidth, spaceWidth, scaleToFit);

  const doesOverflow =
    result.length > maxLines || findLongestLine(result).width > Number(lineWidth);

  return [doesOverflow, result];
};

const calculateWordsByLines = (
  { maxLines, children, style, breakAll }: CalculateWordsByLinesProps,
  initialWordsWithComputedWith: ReadonlyArray<WordWithComputedWidth>,
  spaceWidth: number,
  lineWidth: number | string | undefined,
  scaleToFit: boolean,
): ReadonlyArray<Words> => {
  const shouldLimitLines = isNumber(maxLines);
  const text = String(children);

  const originalResult = calculate(initialWordsWithComputedWith, lineWidth, spaceWidth, scaleToFit);

  if (!shouldLimitLines || scaleToFit) {
    return originalResult;
  }

  const overflows =
    originalResult.length > maxLines || findLongestLine(originalResult).width > Number(lineWidth);
  if (!overflows) {
    return originalResult;
  }

  let start = 0;
  let end = text.length - 1;

  let iterations = 0;
  let trimmedResult: ReadonlyArray<Words> | undefined;

  while (start <= end && iterations <= text.length - 1) {
    const middle = Math.floor((start + end) / 2);
    const prev = middle - 1;

    const [doesPrevOverflow, result] = checkOverflow(
      text,
      prev,
      breakAll,
      style,
      maxLines,
      lineWidth,
      spaceWidth,
      scaleToFit,
    );
    const [doesMiddleOverflow] = checkOverflow(
      text,
      middle,
      breakAll,
      style,
      maxLines,
      lineWidth,
      spaceWidth,
      scaleToFit,
    );

    if (!doesPrevOverflow && !doesMiddleOverflow) {
      start = middle + 1;
    }

    if (doesPrevOverflow && doesMiddleOverflow) {
      end = middle - 1;
    }

    if (!doesPrevOverflow && doesMiddleOverflow) {
      trimmedResult = result;
      break;
    }

    iterations++;
  }

  return trimmedResult || originalResult;
};

const getWordsWithoutCalculate = (children: RenderableText): Array<Words> => {
  const words = !isNullish(children) ? children.toString().split(BREAKING_SPACES) : [];
  return [{ words, width: undefined }];
};

type GetWordsByLinesProps = Pick<
  TextProps,
  "width" | "scaleToFit" | "children" | "style" | "breakAll" | "maxLines"
>;

export const getWordsByLines = ({
  width,
  scaleToFit,
  children,
  style,
  breakAll,
  maxLines,
}: GetWordsByLinesProps): ReadonlyArray<Words> => {
  if ((width || scaleToFit) && !Global.isSsr) {
    const wordWidths = calculateWordWidths({ breakAll, children, style });

    if (wordWidths) {
      return calculateWordsByLines(
        { breakAll, children, maxLines, style },
        wordWidths.wordsWithComputedWidth,
        wordWidths.spaceWidth,
        width,
        Boolean(scaleToFit),
      );
    }
    return getWordsWithoutCalculate(children);
  }
  return getWordsWithoutCalculate(children);
};

const DEFAULT_FILL = "#808080";

export const textDefaultProps = {
  angle: 0,
  breakAll: false,
  capHeight: "0.71em",
  fill: DEFAULT_FILL,
  lineHeight: "1em",
  scaleToFit: false,
  textAnchor: "start",
  verticalAnchor: "end",
  x: 0,
  y: 0,
} as const satisfies Partial<Props>;

const HANDLED_KEYS = [
  "x",
  "y",
  "lineHeight",
  "capHeight",
  "fill",
  "scaleToFit",
  "textAnchor",
  "verticalAnchor",
  "dx",
  "dy",
  "angle",
  "class",
  "breakAll",
  "children",
  "maxLines",
  "width",
  "style",
] as const;

export const Text = (props: Props): JSX.Element => {
  const merged = merge(textDefaultProps, props);

  const wordsByLines = createMemo<ReadonlyArray<Words>>(() =>
    getWordsByLines({
      breakAll: merged.breakAll,
      children: merged.children,
      maxLines: merged.maxLines,
      scaleToFit: merged.scaleToFit,
      style: merged.style,
      width: merged.width,
    }),
  );

  type Geometry = {
    x: number;
    y: number;
    startDy: string;
    transform: string | undefined;
    textProps: Record<string, unknown>;
    fill: string;
    class: string | undefined;
    textAnchor: TextAnchor;
    lineHeight: number | string;
    breakAll: boolean;
  };

  const geometry = createMemo<Geometry | null>(() => {
    const lines = wordsByLines();
    if (!isNumOrStr(merged.x) || !isNumOrStr(merged.y) || lines.length === 0) {
      return null;
    }
    const dx = merged.dx;
    const dy = merged.dy;
    const x = Number(merged.x) + (isNumber(dx) ? dx : 0);
    const y = Number(merged.y) + (isNumber(dy) ? dy : 0);
    if (!isWellBehavedNumber(x) || !isWellBehavedNumber(y)) {
      return null;
    }

    const { lineHeight, capHeight, verticalAnchor } = merged;
    let startDy: string;
    switch (verticalAnchor) {
      case "start":
        startDy = reduceCSSCalc(`calc(${capHeight})`);
        break;
      case "middle":
        startDy = reduceCSSCalc(
          `calc(${(lines.length - 1) / 2} * -${lineHeight} + (${capHeight} / 2))`,
        );
        break;
      default:
        startDy = reduceCSSCalc(`calc(${lines.length - 1} * -${lineHeight})`);
        break;
    }

    const transforms: string[] = [];
    const firstLine = lines[0];
    if (merged.scaleToFit && firstLine != null) {
      const lineWidth = firstLine.width;
      const width = merged.width;
      transforms.push(`scale(${isNumber(width) && isNumber(lineWidth) ? width / lineWidth : 1})`);
    }
    if (merged.angle) {
      transforms.push(`rotate(${merged.angle}, ${x}, ${y})`);
    }
    const transform = transforms.length ? transforms.join(" ") : undefined;

    // Pass-through SVG props (everything except the handled keys); the computed
    // transform is applied as its own attribute on the <text> below.
    const rest = omit(merged, ...HANDLED_KEYS);

    const textProps: Record<string, unknown> = {
      ...rest,
      ...(props.offset != null ? { offset: String(props.offset) } : {}),
      ...(props.height != null ? { height: String(props.height) } : {}),
      ...(props.width != null ? { width: String(props.width) } : {}),
    };

    return {
      x,
      y,
      startDy,
      transform,
      textProps,
      fill: merged.fill == null || merged.fill.includes("url") ? DEFAULT_FILL : merged.fill,
      class: merged.class,
      textAnchor: merged.textAnchor,
      lineHeight: merged.lineHeight,
      breakAll: merged.breakAll,
    };
  });

  // Render inline under <Show> rather than returning the <text> tree from a memo:
  // a memo that returns JSX re-creates the element subtree on every geometry change
  // via its `{memo()}` insert. The <Show> keeps the <text> stable and updates its
  // attributes / line <tspan>s in place.
  return (
    <Show when={geometry()}>
      {(g) => (
        <text
          {...svgPropertiesAndEvents(g().textProps)}
          x={g().x}
          y={g().y}
          transform={g().transform}
          class={["recharts-text", g().class]}
          text-anchor={g().textAnchor}
          fill={g().fill}
        >
          <For each={wordsByLines()}>
            {(line, index) => (
              <tspan x={g().x} dy={index() === 0 ? g().startDy : g().lineHeight}>
                {line.words.join(g().breakAll ? "" : " ")}
              </tspan>
            )}
          </For>
        </text>
      )}
    </Show>
  );
};
