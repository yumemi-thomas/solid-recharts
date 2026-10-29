// Ported from recharts 3.8.1 test/shape/Symbols.spec.tsx.
// Harness changes only: render from the local Solid shim (thunk), no React
// import; `type={undefined}` cast uses `unknown`. The 3 standalone Symbols
// tests are ported; the 4th ('Expect no points attribute on path') renders a
// full LineChart with XAxis/YAxis/Line and is DEFERRED until the chart vertical
// is ported.
import { render } from "@solidjs/testing-library";
import { Surface, Symbols } from "../../src";

describe("<Symbols />", () => {
  test("Render 1 symbol", () => {
    const { container } = render(() => (
      <Surface width={400} height={400}>
        <Symbols type="circle" cx={100} cy={100} />
      </Surface>
    ));

    expect(container.querySelectorAll(".recharts-symbols")).toHaveLength(1);
  });

  test("Render 1 symbol when type is wrong", () => {
    const { container } = render(() => (
      <Surface width={400} height={400}>
        <Symbols cx={100} cy={100} type={undefined} />
      </Surface>
    ));

    expect(container.querySelectorAll(".recharts-symbols")).toHaveLength(1);
  });

  test("Don't render any symbol when cx is invalid", () => {
    const { container } = render(() => (
      <Surface width={400} height={400}>
        <Symbols cy={100} type="circle" />
      </Surface>
    ));

    expect(container.querySelectorAll(".recharts-symbols")).toHaveLength(0);
  });

  // DEFERRED: 'Expect no points attribute on path' renders a full LineChart with
  // XAxis/YAxis/Line — port it with the chart vertical.
});
