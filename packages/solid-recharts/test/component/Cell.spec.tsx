// Ported from recharts 3.8.1 test/component/Cell.spec.tsx.
// Harness changes only: render from the local Solid shim, no React import,
// render takes a thunk. The assertion is byte-identical to recharts.
import { render } from "../helper/render";
import { Cell } from "../../src";

describe("<Cell />", () => {
  it("Render empty dom", () => {
    const { container } = render(() => <Cell />);
    expect(container).toBeEmptyDOMElement();
  });
});
