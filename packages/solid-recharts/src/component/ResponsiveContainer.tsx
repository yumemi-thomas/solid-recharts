// Ported from recharts 3.8.1 src/component/ResponsiveContainer.tsx (commit 7a23854).
// Solid-native rewrite: React context/forwardRef/effects -> Solid context, ref
// prop, and two-arg createEffect. Prop deviation: className -> class.
import {
  Accessor,
  createContext,
  createEffect,
  createMemo,
  createSignal,
  flush,
  omit,
  onCleanup,
  onSettled,
  untrack,
  useContext,
} from "solid-js";
import type { JSX } from "@solidjs/web";
import {
  calculateChartDimensions,
  defaultResponsiveContainerProps,
  getDefaultWidthAndHeight,
  getInnerDivStyle,
} from "./responsiveContainerUtils";
import { isNumber } from "../util/DataUtils";
import { warn } from "../util/LogUtils";
import type { Percent, Size } from "../util/types";
import { isPositiveNumber } from "../util/isWellBehavedNumber";

export interface Props extends Omit<
  JSX.HTMLAttributes<HTMLDivElement>,
  "id" | "class" | "style" | "onResize"
> {
  aspect?: number;
  width?: Percent | number;
  height?: Percent | number;
  minWidth?: string | number;
  minHeight?: string | number;
  initialDimension?: {
    width: number;
    height: number;
  };
  maxHeight?: number;
  children: JSX.Element;
  debounce?: number;
  id?: string | number;
  class?: string | number;
  style?: JSX.CSSProperties;
  onResize?: (width: number, height: number) => void;
  ref?: HTMLDivElement | ((el: HTMLDivElement) => void);
  "data-testid"?: string;
}

export interface ResponsiveContainerCalculations {
  width: number;
  height: number;
}

const missingResponsiveContainerContext = (): Size | undefined => undefined;
const ResponsiveContainerContext = createContext<Accessor<Size | undefined>>(
  missingResponsiveContainerContext,
);

export const useResponsiveContainerContext = (): ResponsiveContainerCalculations | undefined => {
  const context = useContext(ResponsiveContainerContext);
  if (context === missingResponsiveContainerContext) {
    return undefined;
  }
  return {
    get width(): number {
      return context()?.width ?? 0;
    },
    get height(): number {
      return context()?.height ?? 0;
    },
  };
};

function isAcceptableSize(size: {
  width: number | undefined;
  height: number | undefined;
}): size is Size {
  return isPositiveNumber(size.width) && isPositiveNumber(size.height);
}

function ResponsiveContainerContextProvider(props: {
  children: JSX.Element;
  width: number | undefined;
  height: number | undefined;
}): JSX.Element {
  const size = createMemo<Size | undefined>(() => {
    const next = { width: props.width, height: props.height };
    return isAcceptableSize(next) ? next : undefined;
  });

  return (
    <ResponsiveContainerContext value={size}>
      {size() == null ? null : props.children}
    </ResponsiveContainerContext>
  );
}

function kebabCaseStyleName(name: string): string {
  return name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

function cssValue(value: string | number | undefined): string | undefined {
  if (value == null) {
    return undefined;
  }
  if (value === 0) {
    return "0";
  }
  return typeof value === "number" ? `${value}px` : value;
}

function styleObjectToString(style: JSX.CSSProperties | undefined): string {
  if (style == null) {
    return "";
  }
  return Object.entries(style)
    .filter(
      (entry): entry is [string, string | number] =>
        typeof entry[1] === "string" || typeof entry[1] === "number",
    )
    .map(([key, value]) => `${kebabCaseStyleName(key)}: ${cssValue(value)}`)
    .join("; ");
}

function styleEntry(key: string, value: string | number | undefined): string | undefined {
  const formatted = cssValue(value);
  return formatted == null ? undefined : `${key}: ${formatted}`;
}

function joinStyle(parts: ReadonlyArray<string | undefined>): string {
  return parts.filter((part): part is string => part != null && part.length > 0).join("; ");
}

interface DebouncedResize {
  (entries: ResizeObserverEntry[]): void;
  cancel(): void;
}

function isDebouncedResize(
  value: ((entries: ResizeObserverEntry[]) => void) | DebouncedResize,
): value is DebouncedResize {
  return "cancel" in value;
}

function createDebouncedResize(
  callback: (entries: ResizeObserverEntry[]) => void,
  delay: number,
): DebouncedResize {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let latestEntries: ResizeObserverEntry[] | undefined;

  const debounced: DebouncedResize = (entries: ResizeObserverEntry[]): void => {
    latestEntries = entries;
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      timeoutId = undefined;
      if (latestEntries != null) {
        callback(latestEntries);
      }
    }, delay);
  };

  debounced.cancel = (): void => {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
      timeoutId = undefined;
    }
  };

  return debounced;
}

function SizeDetectorContainer(props: Props): JSX.Element {
  // Arbitrary HTML attributes (role, aria-*, data-*, event handlers, …) are
  // forwarded onto the wrapper div, mirroring recharts' `{...others}` spread.
  // We omit every prop this component consumes itself so they don't leak onto
  // the DOM. (`omit` keeps the rest reactive — no destructuring.)
  const others = omit(
    props,
    "aspect",
    "width",
    "height",
    "minWidth",
    "minHeight",
    "initialDimension",
    "maxHeight",
    "children",
    "debounce",
    "id",
    "class",
    "style",
    "onResize",
    "ref",
    "data-testid",
  );
  const initialDimension = (): { width: number; height: number } =>
    props.initialDimension ?? defaultResponsiveContainerProps.initialDimension;
  const width = (): Percent | number | undefined => props.width;
  const height = (): Percent | number | undefined => props.height;
  const minWidth = (): string | number =>
    props.minWidth ?? defaultResponsiveContainerProps.minWidth;
  const debounce = (): number => props.debounce ?? defaultResponsiveContainerProps.debounce;
  const [containerWidth, setContainerWidth] = createSignal(initialDimension().width);
  const [containerHeight, setContainerHeight] = createSignal(initialDimension().height);
  let observer: ResizeObserver | undefined;
  let activeResizeCallback: DebouncedResize | undefined;

  const writeContainerSize = (newWidth: number, newHeight: number): void => {
    const roundedWidth = Math.round(newWidth);
    const roundedHeight = Math.round(newHeight);
    if (untrack(containerWidth) === roundedWidth && untrack(containerHeight) === roundedHeight) {
      return;
    }
    setContainerWidth(roundedWidth);
    setContainerHeight(roundedHeight);
  };

  const setContainerSize = (newWidth: number, newHeight: number): void => {
    writeContainerSize(newWidth, newHeight);
    flush();
  };

  let containerEl: HTMLDivElement | undefined;

  const setRef = (el: HTMLDivElement): void => {
    const forwarded = props.ref;
    if (typeof forwarded === "function") {
      forwarded(el);
    }
    containerEl = el;
  };

  // recharts attaches the observer and takes the initial measure in a useEffect,
  // i.e. AFTER the committed DOM is laid out. The ref callback runs at element
  // creation (possibly before insertion/layout), where getBoundingClientRect()
  // returns 0x0 and a bogus "width(0) and height(0)" warning fires on every
  // mount. `onSettled` is the post-layout equivalent. The initial measure must
  // not flush (onSettled is a leaf scope); the write propagates at the next
  // flush boundary, matching React's setState-in-effect timing.
  onSettled(() => {
    const el = containerEl;
    if (el == null || typeof ResizeObserver === "undefined") {
      return;
    }

    const callback = (entries: ResizeObserverEntry[]): void => {
      const entry = entries[0];
      if (entry == null) {
        return;
      }
      const { width: nextWidth, height: nextHeight } = entry.contentRect;
      setContainerSize(nextWidth, nextHeight);
      props.onResize?.(nextWidth, nextHeight);
    };

    const resizeCallback = debounce() > 0 ? createDebouncedResize(callback, debounce()) : callback;
    activeResizeCallback = isDebouncedResize(resizeCallback) ? resizeCallback : undefined;
    observer = new ResizeObserver(resizeCallback);
    const { width: nextWidth, height: nextHeight } = el.getBoundingClientRect();
    writeContainerSize(nextWidth, nextHeight);
    observer.observe(el);
  });

  onCleanup(() => {
    activeResizeCallback?.cancel();
    observer?.disconnect();
  });

  const calculated = createMemo(() =>
    calculateChartDimensions(containerWidth(), containerHeight(), {
      width: width(),
      height: height(),
      aspect: props.aspect,
      maxHeight: props.maxHeight,
    }),
  );

  const wrapperStyle = (): string =>
    joinStyle([
      styleObjectToString(props.style),
      styleEntry("width", width()),
      styleEntry("height", height()),
      styleEntry("min-width", minWidth()),
      styleEntry("min-height", props.minHeight),
      styleEntry("max-height", props.maxHeight),
    ]);

  createEffect(
    () => props.aspect,
    (aspect) => {
      warn(!aspect || aspect > 0, "The aspect(%s) must be greater than zero.", aspect);
    },
  );

  createEffect(
    () => ({
      containerWidth: containerWidth(),
      containerHeight: containerHeight(),
      calculatedWidth: calculated().calculatedWidth,
      calculatedHeight: calculated().calculatedHeight,
      width: width(),
      height: height(),
      minWidth: minWidth(),
      minHeight: props.minHeight,
      aspect: props.aspect,
    }),
    (value) => {
      warn(
        value.containerWidth < 0 ||
          value.containerHeight < 0 ||
          (value.calculatedWidth != null && value.calculatedWidth > 0) ||
          (value.calculatedHeight != null && value.calculatedHeight > 0),
        `The width(%s) and height(%s) of chart should be greater than 0,
       please check the style of container, or the props width(%s) and height(%s),
       or add a minWidth(%s) or minHeight(%s) or use aspect(%s) to control the
       height and width.`,
        value.calculatedWidth,
        value.calculatedHeight,
        value.width,
        value.height,
        value.minWidth,
        value.minHeight,
        value.aspect,
      );
    },
  );

  return (
    <div
      id={props.id ? `${props.id}` : undefined}
      class={["recharts-responsive-container", props.class]}
      style={wrapperStyle()}
      ref={setRef}
      data-testid={props["data-testid"]}
      {...others}
    >
      <div style={getInnerDivStyle({ width: width(), height: height() })}>
        <ResponsiveContainerContextProvider
          width={calculated().calculatedWidth}
          height={calculated().calculatedHeight}
        >
          {props.children}
        </ResponsiveContainerContextProvider>
      </div>
    </div>
  );
}

export function ResponsiveContainer(props: Props): JSX.Element {
  const responsiveContainerContext = useResponsiveContainerContext();
  const hasParentResponsiveContainer = createMemo(
    () =>
      responsiveContainerContext != null &&
      isPositiveNumber(responsiveContainerContext.width) &&
      isPositiveNumber(responsiveContainerContext.height),
  );

  const defaults = createMemo(() =>
    getDefaultWidthAndHeight({
      width: props.width,
      height: props.height,
      aspect: props.aspect,
    }),
  );

  const calculated = createMemo(() =>
    calculateChartDimensions(undefined, undefined, {
      width: defaults().width,
      height: defaults().height,
      aspect: props.aspect,
      maxHeight: props.maxHeight,
    }),
  );

  return (
    <>
      {hasParentResponsiveContainer() ? (
        props.children
      ) : isNumber(calculated().calculatedWidth) && isNumber(calculated().calculatedHeight) ? (
        <ResponsiveContainerContextProvider
          width={calculated().calculatedWidth}
          height={calculated().calculatedHeight}
        >
          {props.children}
        </ResponsiveContainerContextProvider>
      ) : (
        <SizeDetectorContainer {...props} width={defaults().width} height={defaults().height} />
      )}
    </>
  );
}
