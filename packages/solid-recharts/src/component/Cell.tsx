// Ported from recharts 3.8.1 src/component/Cell.tsx (commit 7a23854).
// Deviations: React's `SVGProps<SVGElement>` → Solid's `CamelSvgProps<JSX.SVGAttributes<SVGElement>>`
// (which already names the class prop `class`); React's `displayName` is dropped.
//
// The CellReader pattern: recharts extracts cells by walking the React element
// tree (`findAllByType(children, Cell)`). Solid has no element-descriptor tree —
// `props.children` is already-evaluated, so `<Cell>` returns nothing renderable.
// Instead each <Cell> registers its props into a module-level registrar while a
// parent (Bar/Pie/RadialBar) synchronously resolves its children inside
// `collectCells`. Cells render no DOM (the standalone <Cell /> spec asserts this).
import { type CamelSvgProps } from "../util/svgPropertiesNoEvents";
import { children, createMemo, untrack, type Accessor } from "solid-js";
import type { JSX } from "@solidjs/web";

export interface CellProps extends CamelSvgProps<JSX.SVGAttributes<SVGElement>> {
  /**
   * The fill color.
   */
  fill?: string;
  /**
   * The stroke color.
   */
  stroke?: string;
}

/**
 * Set while a parent collects its <Cell> children (see {@link collectCells}).
 * A stack-discipline save/restore in collectCells keeps nested collections sound.
 */
let currentCellRegistrar: ((cell: CellProps) => void) | undefined;

/**
 * Cell component used to define colors and styles of chart elements.
 *
 * This component is now deprecated and will be removed in Recharts 4.0.
 *
 * Please use the `shape` prop or `content` prop on the respective chart components
 * to customize the rendering of chart elements instead of using `Cell`.
 *
 * @see {@link https://recharts.github.io/en-US/guide/cell/ Guide: Migrate from Cell component to shape prop}
 *
 * @deprecated
 * @consumes CellReader
 */
export const Cell = (props: CellProps): JSX.Element => {
  // Registers into the parent's collector when rendered inside one; renders
  // nothing either way (standalone <Cell /> → empty DOM).
  currentCellRegistrar?.(props);
  return undefined;
};

/**
 * Evaluates children with Cell registration active and returns the non-Cell
 * output unchanged. This lets a graphical item establish contexts (e.g. the
 * polar label context) around its children — evaluated exactly once, under that
 * provider — while still collecting the <Cell>s among them.
 *
 * As in {@link collectCells}, the children are fully resolved inside the
 * registration window so <Cell>s produced lazily by a `<For>` register too.
 */
export function CellReader(props: {
  children: JSX.Element;
  onCells: (cells: ReadonlyArray<CellProps>) => void;
}): JSX.Element {
  return (
    <>
      {(() => {
        const collected: CellProps[] = [];
        const prev = currentCellRegistrar;
        currentCellRegistrar = (cell) => collected.push(cell);
        let result: JSX.Element;
        try {
          result = children(() => props.children)();
        } finally {
          currentCellRegistrar = prev;
        }
        // The consumer compares the new list against the last one by reading each
        // cell's props; that comparison must not subscribe this render to them.
        untrack(() => props.onCells(collected));
        return result;
      })()}
    </>
  );
}

/**
 * Resolves `childrenAccessor` synchronously with the cell registrar active, so
 * every nested <Cell> reports its (reactive) props in document order. Returns the
 * collected cells as an accessor — recomputes if the children change, mirroring
 * recharts' `useMemo(() => findAllByType(children, Cell), [children])`.
 *
 * The children are fully resolved (`children()`), not just read: a `<For>` returns
 * its rows lazily (they are created when the returned accessor is first called),
 * so without resolving it the rows' <Cell>s would evaluate after this window has
 * closed and never register. A row added later re-runs this memo (it tracks the
 * resolved children), which re-creates the list inside a fresh window.
 */
export const collectCells = (
  childrenAccessor: () => JSX.Element,
): Accessor<ReadonlyArray<CellProps>> =>
  createMemo<ReadonlyArray<CellProps>>(() => {
    const collected: CellProps[] = [];
    const prev = currentCellRegistrar;
    currentCellRegistrar = (cell) => collected.push(cell);
    try {
      // Resolving the children evaluates each <Cell>, triggering its registration.
      void children(childrenAccessor)();
    } finally {
      currentCellRegistrar = prev;
    }
    return collected;
  });
