// Ported from recharts 3.8.1 test/shape/ActiveShape.spec.tsx.
//
// Harness adaptations: React render -> Solid render(() => <…/>); @testing-library/react
// -> the repo's local testing-library; React className -> Solid class.
//
// Scope: the Solid Funnel supports `shape` ONLY in function form, and renders no
// `.recharts-active-shape` wrapper (activeShape is function-only, called directly).
// So only the function-form `shape` case, plus the two activeShape cases that assert
// expectedLength 0 (no active shape rendered), are impl-ready here.
import { render, fireEvent } from "@solid-recharts/testing-library";
import { Funnel, FunnelChart, Trapezoid, Tooltip } from "../../src";
import { assertNotNull } from "../helper/assertNotNull";
import type { FunnelTrapezoidItem } from "../../src/cartesian/Funnel";

const funnelData = [
  { value: 100, name: "展现" },
  { value: 80, name: "点击" },
  { value: 50, name: "访问" },
  { value: 40, name: "咨询" },
  { value: 26, name: "订单" },
];

describe("Active Shape", () => {
  test("Funnel renders customized shape when shape is set to be a function", () => {
    const { container } = render(() => (
      <FunnelChart width={700} height={200}>
        <Funnel
          width={400}
          data={funnelData}
          dataKey="value"
          isAnimationActive={false}
          shape={(props: FunnelTrapezoidItem) => <Trapezoid {...props} class="custom-trap-shape" />}
        />
      </FunnelChart>
    ));
    const customShapes = container.querySelectorAll(".custom-trap-shape");
    expect(customShapes).toHaveLength(5);
  });

  test("Funnel does not render customized active shape when activeShape is not set", () => {
    const { container } = render(() => (
      <FunnelChart width={700} height={200}>
        <Funnel width={400} data={funnelData} dataKey="value" isAnimationActive={false} />
        <Tooltip />
      </FunnelChart>
    ));
    const shapes = container.querySelectorAll(".recharts-funnel-trapezoid");
    const [shape] = Array.from(shapes);
    assertNotNull(shape);
    fireEvent.mouseOver(shape);
    const activeShape = container.querySelectorAll(".recharts-active-shape");
    expect(activeShape).toHaveLength(0);
  });
});
