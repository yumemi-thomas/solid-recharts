// Ported from recharts 3.9.2 test/shape/ActiveShape.spec.tsx.
//
// Harness adaptations: React render(element) -> Solid render(() => <…/>) (each
// `element` is a render thunk); @testing-library/react -> the repo's local
// testing-library; React `className` -> Solid `class` (object-form shape options
// too); the activeShape block is activated via the port's `showTooltip` helper
// (Solid's `onMouseEnter` is a native mouseenter listener, so a bare
// `fireEvent.mouseOver` on the trapezoid Layer would not set the active index —
// showTooltip drives the tooltip mouse-move at the default coordinate, which is
// what sets the active item index that `activeShape` keys off).
//
// The `<Funnel>` shape now renders through the shared `<Shape>` wrapper (via
// `<FunnelTrapezoid>`), so an active shape is wrapped in a
// `<Layer class="recharts-active-shape">` exactly like upstream.
//
// Scope: the React-element option forms are PERMANENT-N/A (Solid has no
// cloneElement — ActiveShape drops the ReactElement constituent), so those two
// upstream cases are omitted. The function, object, and boolean forms are ported
// verbatim (modulo className->class).
import { describe, expect, test } from "vitest";
import { render } from "../helper/render";
import { Funnel, FunnelChart, Trapezoid, Tooltip } from "../../src";
import { showTooltip } from "../component/Tooltip/tooltipTestHelpers";
import { funnelChartMouseHoverTooltipSelector } from "../component/Tooltip/tooltipMouseHoverSelectors";
import type { JSX } from "@solidjs/web";
import type { FunnelTrapezoidItem } from "../../src/cartesian/Funnel";

const funnelData = [
  { value: 100, name: "展现" },
  { value: 80, name: "点击" },
  { value: 50, name: "访问" },
  { value: 40, name: "咨询" },
  { value: 26, name: "订单" },
];

type ActiveShapeTestParams = {
  element: () => JSX.Element;
  activeClass: string;
  expectedLength: number;
  name: string;
  shapeClass?: string;
};

const funnelShapes: ActiveShapeTestParams[] = [
  {
    name: "Funnel renders customized shape when shape is set to be a function",
    element: () => (
      <FunnelChart width={700} height={200}>
        <Funnel
          width={400}
          data={funnelData}
          dataKey="value"
          isAnimationActive={false}
          shape={(props: FunnelTrapezoidItem) => <Trapezoid {...props} class="custom-trap-shape" />}
        />
      </FunnelChart>
    ),
    activeClass: ".custom-trap-shape",
    expectedLength: 5,
  },
  {
    name: "Funnel renders customized shape when shape is set to be an object",
    element: () => (
      <FunnelChart width={700} height={200}>
        <Funnel
          width={400}
          data={funnelData}
          dataKey="value"
          isAnimationActive={false}
          shape={{ class: "custom-trap-shape" }}
        />
      </FunnelChart>
    ),
    activeClass: ".custom-trap-shape",
    expectedLength: 5,
  },
];

const funnelActiveShapes: ActiveShapeTestParams[] = [
  {
    name: "Funnel renders customized active shape when activeShape is set to be a function",
    element: () => (
      <FunnelChart width={700} height={200}>
        <Funnel
          width={400}
          data={funnelData}
          dataKey="value"
          isAnimationActive={false}
          activeShape={(props: FunnelTrapezoidItem) => <Trapezoid {...props} />}
        />
        <Tooltip />
      </FunnelChart>
    ),
    shapeClass: ".recharts-funnel-trapezoid",
    activeClass: ".recharts-active-shape",
    expectedLength: 1,
  },
  {
    name: "Funnel renders customized active shape when activeShape is set to be an object",
    element: () => (
      <FunnelChart width={700} height={200}>
        <Funnel
          width={400}
          data={funnelData}
          dataKey="value"
          isAnimationActive={false}
          activeShape={{ fill: "red", strokeWidth: 2 }}
        />
        <Tooltip />
      </FunnelChart>
    ),
    shapeClass: ".recharts-funnel-trapezoid",
    activeClass: ".recharts-active-shape",
    expectedLength: 1,
  },
  {
    name: "Funnel renders customized active shape when activeShape is set to be a boolean",
    element: () => (
      <FunnelChart width={700} height={200}>
        <Funnel
          width={400}
          data={funnelData}
          dataKey="value"
          isAnimationActive={false}
          activeShape
        />
        <Tooltip />
      </FunnelChart>
    ),
    shapeClass: ".recharts-funnel-trapezoid",
    activeClass: ".recharts-active-shape",
    expectedLength: 1,
  },
  {
    name: "Funnel does not render customized active shape when activeShape is set to be a falsy boolean",
    element: () => (
      <FunnelChart width={700} height={200}>
        <Funnel
          width={400}
          data={funnelData}
          dataKey="value"
          isAnimationActive={false}
          activeShape={false}
        />
        <Tooltip />
      </FunnelChart>
    ),
    shapeClass: ".recharts-funnel-trapezoid",
    activeClass: ".recharts-active-shape",
    expectedLength: 0,
  },
  {
    name: "Funnel does not render customized active shape when activeShape is not set",
    element: () => (
      <FunnelChart width={700} height={200}>
        <Funnel width={400} data={funnelData} dataKey="value" isAnimationActive={false} />
        <Tooltip />
      </FunnelChart>
    ),
    shapeClass: ".recharts-funnel-trapezoid",
    activeClass: ".recharts-active-shape",
    expectedLength: 0,
  },
];

describe("Active Shape", () => {
  // testing that the shape prop is rendered
  test.each(funnelShapes)("$name", ({ element, activeClass, expectedLength }) => {
    const { container } = render(element);
    const customShapes = container.querySelectorAll(activeClass);
    expect(customShapes).toHaveLength(expectedLength);
  });

  // testing that the activeShape prop is rendered via tooltip
  test.each(funnelActiveShapes)("$name", ({ element, activeClass, expectedLength, shapeClass }) => {
    const { container } = render(element);
    showTooltip(container, shapeClass ?? funnelChartMouseHoverTooltipSelector);
    const activeShape = container.querySelectorAll(activeClass);
    expect(activeShape).toHaveLength(expectedLength);
  });
});
