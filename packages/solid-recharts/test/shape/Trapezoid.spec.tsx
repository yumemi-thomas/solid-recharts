// Ported from recharts 3.8.1 test/shape/Trapezoid.spec.tsx.
// Harness changes only: render from the local Solid shim (thunk), no React
// import. The 'with animation' case snapshot matches the reference byte-for-byte
// (the update-animation path renders the t=0 frame with the "0px 1px" dash).
import { render } from "../helper/render";
import { Surface, Trapezoid } from "../../src";

describe("<Trapezoid />", () => {
  test("Render 1 Trapezoid in simple Trapezoid", () => {
    const { container } = render(() => (
      <Surface width={500} height={500}>
        <Trapezoid fill="#f00" x={300} y={100} upperWidth={100} lowerWidth={0} height={50} />
      </Surface>
    ));

    expect(container.querySelectorAll(".recharts-trapezoid")).toHaveLength(1);
    expect(container).toMatchSnapshot();
  });

  test("Render 1 Trapezoid with animation in simple Trapezoid", () => {
    const { container } = render(() => (
      <Surface width={500} height={500}>
        <Trapezoid
          fill="#f00"
          x={300}
          y={100}
          upperWidth={100}
          lowerWidth={0}
          height={50}
          isUpdateAnimationActive
        />
      </Surface>
    ));

    expect(container.querySelectorAll(".recharts-trapezoid")).toHaveLength(1);
    expect(container).toMatchSnapshot();
  });

  test("Don't render any Trapezoid when props are invalid", () => {
    const { container } = render(() => (
      <Surface width={500} height={500}>
        <Trapezoid fill="#f00" x={300} y={100} upperWidth={0} lowerWidth={0} height={50} />
        <Trapezoid fill="#f00" x={300} y={100} upperWidth={100} lowerWidth={0} height={0} />
      </Surface>
    ));

    expect(container.querySelectorAll(".recharts-trapezoid")).toHaveLength(0);
    expect(container).toMatchSnapshot();
  });
});
