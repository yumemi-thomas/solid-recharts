// Ported from recharts 3.8.1 src/animation/easing.ts (commit 7a23854).
// Pure math — no framework surface — so behavior is byte-identical to recharts.
// Deviations from the reference are limited to satisfying this repo's type
// discipline (no `as` / no non-null `!`); `as const` is retained where it
// brands the stepper/bezier discriminant.

export const ACCURACY = 1e-4;

const cubicBezierFactor = (c1: number, c2: number): number[] => [
  0,
  3 * c1,
  3 * c2 - 6 * c1,
  3 * c1 - 3 * c2 + 1,
];

const evaluatePolynomial = (params: ReadonlyArray<number>, t: number): number =>
  params.map((param, i) => param * t ** i).reduce((pre, curr) => pre + curr);

const cubicBezier = (c1: number, c2: number) => (t: number) => {
  const params = cubicBezierFactor(c1, c2);

  return evaluatePolynomial(params, t);
};

const derivativeCubicBezier = (c1: number, c2: number) => (t: number) => {
  const params = cubicBezierFactor(c1, c2);
  const newParams = [...params.map((param, i) => param * i).slice(1), 0];

  return evaluatePolynomial(newParams, t);
};

type CubicBezierTemplate = `cubic-bezier(${number},${number},${number},${number})`;

export type NamedBezier =
  | "linear"
  | "ease"
  | "ease-in"
  | "ease-out"
  | "ease-in-out"
  | CubicBezierTemplate;

type BezierInput = [NamedBezier] | [number, number, number, number];

export type BezierEasingFunction = {
  isStepper: false;
  (t: number): number;
};

const parseCubicBezier = (easing: string): [number, number, number, number] | null => {
  const easingParts = easing.split("(");
  if (easingParts.length !== 2 || easingParts[0] !== "cubic-bezier") {
    return null;
  }
  const numbers = easingParts[1]?.split(")")[0]?.split(",");
  if (numbers == null || numbers.length !== 4) {
    return null;
  }
  const [x1, y1, x2, y2] = numbers.map((x: string) => parseFloat(x));
  // `noUncheckedIndexedAccess` keeps the tuple elements possibly-undefined even
  // after the length check, so narrow explicitly instead of asserting.
  if (x1 === undefined || y1 === undefined || x2 === undefined || y2 === undefined) {
    return null;
  }
  return [x1, y1, x2, y2];
};

const getBezierCoordinates = (...args: BezierInput): [number, number, number, number] => {
  if (args.length === 1) {
    switch (args[0]) {
      case "linear":
        return [0.0, 0.0, 1.0, 1.0];
      case "ease":
        return [0.25, 0.1, 0.25, 1.0];
      case "ease-in":
        return [0.42, 0.0, 1.0, 1.0];
      case "ease-out":
        return [0.42, 0.0, 0.58, 1.0];
      case "ease-in-out":
        return [0.0, 0.0, 0.58, 1.0];
      default: {
        const easing = parseCubicBezier(args[0]);
        if (easing) {
          return easing;
        }
      }
    }
  }

  if (args.length === 4) {
    return args;
  }

  // Fallback for invalid inputs. The previous implementation was buggy and would lead to NaN.
  // Returning linear easing is a safe default.
  return [0.0, 0.0, 1.0, 1.0];
};

const createBezierEasing = (
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): BezierEasingFunction => {
  const curveX = cubicBezier(x1, x2);
  const curveY = cubicBezier(y1, y2);
  const derCurveX = derivativeCubicBezier(x1, x2);
  const rangeValue = (value: number): number => {
    if (value > 1) {
      return 1;
    }
    if (value < 0) {
      return 0;
    }

    return value;
  };

  const bezier = (_t: number) => {
    const t = _t > 1 ? 1 : _t;
    let x = t;

    for (let i = 0; i < 8; ++i) {
      const evalT = curveX(x) - t;
      const derVal = derCurveX(x);

      if (Math.abs(evalT - t) < ACCURACY || derVal < ACCURACY) {
        return curveY(x);
      }

      x = rangeValue(x - evalT / derVal);
    }

    return curveY(x);
  };

  bezier.isStepper = false as const;

  return bezier;
};

// calculate cubic-bezier using Newton's method
export const configBezier = (...args: BezierInput): BezierEasingFunction => {
  return createBezierEasing(...getBezierCoordinates(...args));
};

type SpringInput = {
  /**
   * The stiffness coefficient of the spring.
   * Higher values create a more forceful, faster pull towards the target.
   */
  stiff?: number;
  /**
   * The damping coefficient (friction/resistance).
   * Higher values reduce bounciness and stop oscillation sooner. Lower values create more bounce.
   */
  damping?: number;
  /**
   * The physics simulation time step in milliseconds.
   * Determines the granularity of the baked frames. 16.67ms roughly equals a 60fps frame delta.
   */
  dt?: number;
};

/**
 * Creates a performance-optimized, progress-based spring easing function.
 * It pre-calculates ("bakes") spring physics frames upfront based on a fixed duration,
 * then returns a pure, lightweight function mapping progress (0 to 1) to the animated position.
 * This approach is ideal for low-power devices because it removes heavy physics math from the frame loop.
 */
export const createSpringEasing = (config: SpringInput = {}): ProgressEasingFn => {
  const { stiff = 100, damping = 8, dt = 16.67 } = config;
  const destX = 1;

  const positions: number[] = [0];
  let currX = 0;
  let currV = 0;

  // Safety valve to prevent accidental infinite loops if physics config is extreme
  const maxIterations = 10000;
  let iterations = 0;

  // 1. Run the simulation until the spring completely stops moving
  while (iterations < maxIterations) {
    const FSpring = -(currX - destX) * stiff;
    const FDamping = currV * damping;

    currV += ((FSpring - FDamping) * dt) / 1000;
    currX += (currV * dt) / 1000;

    positions.push(currX);

    // Stop only when position is essentially at 1.0 AND bounce velocity has died down
    if (Math.abs(currX - destX) < ACCURACY && Math.abs(currV) < ACCURACY) {
      break;
    }
    iterations++;
  }

  // Force the absolute final element to be exactly 1.0 for a perfect finish
  positions[positions.length - 1] = destX;
  const maxIndex = positions.length - 1;

  // 2. The ultra-smooth runtime function mapping your 0..1 progress
  return (t: number): number => {
    if (t <= 0) return 0;
    if (t >= 1) return destX;

    // Scale t (0..1) proportionally across our entire pre-calculated array
    const exactFrame = t * maxIndex;
    const index = Math.floor(exactFrame);
    const fraction = exactFrame - index;

    // Blend between the two closest frames
    return (
      (positions[index] ?? 0) + ((positions[index + 1] ?? 0) - (positions[index] ?? 0)) * fraction
    );
  };
};

/**
 * The unified easing-function shape (v3.9): maps progress `t` to an eased value.
 * `ProgressEasingFn` is the canonical name; `EasingFunction` is kept as an alias for
 * callers that reference it.
 */
export type ProgressEasingFn = (t: number) => number;
export type EasingFunction = ProgressEasingFn;

/**
 * @inline
 */
export type EasingInput = NamedBezier | "spring" | EasingFunction;

/**
 * The v3.9 easing resolver. Resolves an {@link EasingInput} to a {@link ProgressEasingFn}:
 * named beziers, `cubic-bezier(...)`, `'spring'` via baked physics, or a passed-through
 * `(t) => number`. Returns `null` for unrecognized input.
 */
export const createEasingFunction = (easing: EasingInput): ProgressEasingFn | null => {
  if (typeof easing === "string") {
    switch (easing) {
      case "ease":
      case "ease-in-out":
      case "ease-out":
      case "ease-in":
      case "linear":
        return configBezier(easing);
      case "spring":
        return createSpringEasing();
      default:
        if (easing.split("(")[0] === "cubic-bezier") {
          return configBezier(easing);
        }
    }
  }

  if (typeof easing === "function") {
    return easing;
  }

  return null;
};
