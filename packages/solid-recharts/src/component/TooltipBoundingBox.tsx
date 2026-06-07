// Ported from recharts 3.8.1 src/component/TooltipBoundingBox.tsx (commit 7a23854).
//
// Deviations: React.useState → createSignal; the keydown (Escape-to-dismiss)
// listener moves from useEffect to onSettled (single listener; the handler reads
// the live props.coordinate at event time); the "reset dismissed when the
// coordinate moves" inline setState becomes a createEffect; `React.memo` dropped
// (Solid is fine-grained); `className`→`class`, `tabIndex`→`tabindex`, React
// CSSProperties → JSX.CSSProperties (kebab keys); the `xmlns` attribute is dropped
// (the tooltip renders into an HTML portal div, not inside the SVG).
import { createEffect, createSignal, onSettled } from "solid-js";
import type { JSX } from "@solidjs/web";
import {
  AllowInDimension,
  AnimationDuration,
  CartesianViewBox,
  Coordinate,
  EasingInput,
  PolarCoordinate,
} from "../util/types";
import { ElementOffset, SetElementOffset } from "../util/useElementOffset";
import { getTooltipTranslate } from "../util/tooltip/translate";
import { usePrefersReducedMotion } from "../util/usePrefersReducedMotion";

export type TooltipBoundingBoxProps = {
  active: boolean;
  allowEscapeViewBox: AllowInDimension;
  animationDuration: AnimationDuration;
  animationEasing: EasingInput;
  children: JSX.Element;
  coordinate: Coordinate | PolarCoordinate | undefined;
  hasPayload: boolean;
  isAnimationActive: boolean | "auto";
  offset: number | Coordinate;
  position: Partial<Coordinate> | undefined;
  reverseDirection: AllowInDimension;
  useTranslate3d: boolean;
  viewBox: CartesianViewBox;
  wrapperStyle: JSX.CSSProperties;
  lastBoundingBox: ElementOffset;
  innerRef: SetElementOffset;
  hasPortalFromProps: boolean;
};

function resolveTransitionProperty(args: {
  prefersReducedMotion: boolean;
  isAnimationActive: boolean | "auto";
  active: boolean;
  animationDuration: number;
  animationEasing: EasingInput;
}): `transform ${number}ms ${string}` | undefined {
  if (args.prefersReducedMotion && args.isAnimationActive === "auto") {
    return undefined;
  }
  if (args.isAnimationActive && args.active) {
    const easing = typeof args.animationEasing === "string" ? args.animationEasing : "ease";
    return `transform ${args.animationDuration}ms ${easing}`;
  }
  return undefined;
}

type DismissState = {
  dismissed: boolean;
  dismissedAtCoordinate: { x: number; y: number };
};

export const TooltipBoundingBox = (props: TooltipBoundingBoxProps): JSX.Element => {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [state, setState] = createSignal<DismissState>({
    dismissed: false,
    dismissedAtCoordinate: { x: 0, y: 0 },
  });

  // Track the live coordinate so the keydown handler (which fires outside any
  // tracking scope) reads it without a STRICT_READ_UNTRACKED.
  const coordinate = (): { x: number; y: number } => ({
    x: props.coordinate?.x ?? 0,
    y: props.coordinate?.y ?? 0,
  });

  onSettled(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setState({ dismissed: true, dismissedAtCoordinate: coordinate() });
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  });

  // Re-show after dismissal once the coordinate moves to a new spot. Both the
  // coordinate and the dismiss state are read in the compute (a tracking scope);
  // the apply only writes, so no untracked read fires.
  createEffect(
    () => ({ coord: coordinate(), st: state() }),
    ({ coord, st }) => {
      if (
        st.dismissed &&
        (coord.x !== st.dismissedAtCoordinate.x || coord.y !== st.dismissedAtCoordinate.y)
      ) {
        setState({ ...st, dismissed: false });
      }
    },
  );

  const translate = (): { cssProperties: JSX.CSSProperties; cssClasses: string } =>
    getTooltipTranslate({
      allowEscapeViewBox: props.allowEscapeViewBox,
      coordinate: props.coordinate,
      offsetLeft: typeof props.offset === "number" ? props.offset : props.offset.x,
      offsetTop: typeof props.offset === "number" ? props.offset : props.offset.y,
      position: props.position,
      reverseDirection: props.reverseDirection,
      tooltipBox: {
        height: props.lastBoundingBox.height,
        width: props.lastBoundingBox.width,
      },
      useTranslate3d: props.useTranslate3d,
      viewBox: props.viewBox,
    });

  const outerStyle = (): JSX.CSSProperties => {
    const positionStyle: JSX.CSSProperties = props.hasPortalFromProps
      ? {}
      : {
          transition: resolveTransitionProperty({
            prefersReducedMotion: prefersReducedMotion(),
            isAnimationActive: props.isAnimationActive,
            active: props.active,
            animationDuration: props.animationDuration,
            animationEasing: props.animationEasing,
          }),
          ...translate().cssProperties,
          "pointer-events": "none",
          position: "absolute",
          top: 0,
          left: 0,
        };
    return {
      ...positionStyle,
      visibility: !state().dismissed && props.active && props.hasPayload ? "visible" : "hidden",
      ...props.wrapperStyle,
    };
  };

  return (
    <div tabindex={-1} class={translate().cssClasses} style={outerStyle()} ref={props.innerRef}>
      {props.children}
    </div>
  );
};
