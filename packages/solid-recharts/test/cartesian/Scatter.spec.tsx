// Port of recharts 3.8.1 test/cartesian/Scatter.spec.tsx (commit 7a23854) — the
// behavioral subset whose features the Solid Scatter implements: symbol geometry,
// custom component, empty data, function-form `shape`, and the explicit-id DOM
// element. Deferred (impl gaps / minimal-port deferrals, tracked in TESTS.md):
// element-form `shape`, the `line` connector, mouse/touch event prop snapshots,
// implicit `fill` read from the data array, clip-path (and thus the explicit-id
// clipPath case), and the <Customized>/render-count state-integration case.
import { describe, expect, it, test, vi } from "vitest";
import { Scatter, ScatterChart, ScatterProps, XAxis } from "../../src";
import { assertNotNull } from "../helper/assertNotNull";
import { expectScatterPoints } from "../helper/expectScatterPoints";
import { createSelectorTestCase } from "../helper/createSelectorTestCase";
import { expectLastCalledWith } from "../helper/expectLastCalledWith";
import { fireEvent, render } from "../helper/render";
import { dataWithSpecialNameAndFillProperties } from "../_data";

describe("<Scatter />", () => {
  const data = [
    { cx: 10, cy: 50, size: 64, payload: { x: 12, y: 23, z: 78 } },
    { cx: 50, cy: 50, size: 64, payload: { x: 12, y: 23, z: 78 } },
    { cx: 90, cy: 50, size: 64, payload: { x: 12, y: 23, z: 78 } },
    { cx: 130, cy: 50, size: 64, payload: { x: 12, y: 23, z: 78 } },
    { cx: 170, cy: 50, size: 64, payload: { x: 12, y: 23, z: 78 } },
  ];

  test("Render symbols in a simple Scatter", () => {
    const { container } = render(() => (
      <ScatterChart width={500} height={500}>
        <Scatter data={data} dataKey="cx" />
      </ScatterChart>
    ));

    expectScatterPoints(container, [
      {
        cx: "54",
        cy: "467.77777777777777",
        d: "M0,0",
        height: "9.0270333367641",
        transform: "translate(54, 467.77777777777777)",
        width: "9.0270333367641",
      },
      {
        cx: "152",
        cy: "358.8888888888889",
        d: "M0,0",
        height: "9.0270333367641",
        transform: "translate(152, 358.8888888888889)",
        width: "9.0270333367641",
      },
      {
        cx: "250",
        cy: "250",
        d: "M0,0",
        height: "9.0270333367641",
        transform: "translate(250, 250)",
        width: "9.0270333367641",
      },
      {
        cx: "348",
        cy: "141.11111111111111",
        d: "M0,0",
        height: "9.0270333367641",
        transform: "translate(348, 141.11111111111111)",
        width: "9.0270333367641",
      },
      {
        cx: "446",
        cy: "32.222222222222236",
        d: "M0,0",
        height: "9.0270333367641",
        transform: "translate(446, 32.222222222222236)",
        width: "9.0270333367641",
      },
    ]);
  });

  test("Can render in custom component", () => {
    const CustomScatter = (props: ScatterProps) => {
      return <Scatter {...props} />;
    };

    const { container } = render(() => (
      <ScatterChart width={500} height={500}>
        <CustomScatter data={[]} />
      </ScatterChart>
    ));

    expectScatterPoints(container, []);
  });

  test("Don't render any symbols when data is empty", () => {
    const { container } = render(() => (
      <ScatterChart width={500} height={500}>
        <Scatter data={[]} />
      </ScatterChart>
    ));

    expectScatterPoints(container, []);
  });

  test("Render customized symbols when shape is set to be a function", () => {
    const renderCustomizedShape = ({ cx, cy }: { cx?: number; cy?: number }) => (
      <circle cx={cx} cy={cy} r={5} class="customized-shape" />
    );
    const { container } = render(() => (
      <ScatterChart width={500} height={500}>
        <Scatter
          isAnimationActive={false}
          shape={renderCustomizedShape}
          data={data}
          dataKey="size"
        />
      </ScatterChart>
    ));

    expect(container.querySelectorAll(".customized-shape")).toHaveLength(data.length);
  });

  test("Render customized line when line is set to be a function", () => {
    const renderCustomizedLine = () => <path d="M0,0L200,200" class="customized-line" />;
    const { container } = render(() => (
      <ScatterChart width={500} height={500}>
        <Scatter isAnimationActive={false} line={renderCustomizedLine} data={data} dataKey="size" />
      </ScatterChart>
    ));

    expect(container.querySelectorAll(".customized-line")).toHaveLength(1);
  });

  test("mouse enter or mouse leave a symbol", () => {
    const onClick = vi.fn();
    const onMouseEnter = vi.fn();
    const onMouseLeave = vi.fn();

    const { container } = render(() => (
      <ScatterChart width={500} height={500}>
        <Scatter
          isAnimationActive={false}
          data={data}
          dataKey="cx"
          onClick={onClick}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
        />
      </ScatterChart>
    ));
    // recharts binds the handlers on the symbol via React synthetic delegation; the
    // Solid port binds them on the wrapping `.recharts-scatter-symbol` Layer <g>. Since
    // mouseEnter/mouseLeave do not bubble in the DOM, fire on that carrier element (the
    // 5th symbol's <g>) — harness-only swap of the queried element.
    const symbol = container.querySelectorAll(".recharts-scatter-symbol")[4];
    assertNotNull(symbol);
    fireEvent.mouseEnter(symbol);
    expect(onMouseEnter).toHaveBeenCalled();
    fireEvent.mouseLeave(symbol);
    expect(onMouseLeave).toHaveBeenCalled();
    fireEvent.click(symbol);
    expect(onClick).toHaveBeenCalled();
  });

  it("should implicitly read `fill` property from the data array but not `name`", () => {
    const view = render(() => (
      <ScatterChart width={500} height={500} data={dataWithSpecialNameAndFillProperties}>
        <Scatter dataKey="value" />
      </ScatterChart>
    ));
    const { container } = view;
    expect.soft(view.queryByText("name1")).not.toBeInTheDocument();
    expect.soft(view.queryByText("name2")).not.toBeInTheDocument();
    expect.soft(view.queryByText("name3")).not.toBeInTheDocument();
    expect.soft(view.queryByText("name4")).not.toBeInTheDocument();
    expect.soft(container.querySelector('[fill="fill1"]')).toBeInTheDocument();
    expect.soft(container.querySelector('[fill="fill2"]')).toBeInTheDocument();
    expect.soft(container.querySelector('[fill="fill3"]')).toBeInTheDocument();
    expect.soft(container.querySelector('[fill="fill4"]')).toBeInTheDocument();
  });

  describe("with explicit ID prop", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <ScatterChart width={500} height={500}>
        <Scatter isAnimationActive={false} data={data} dataKey="cx" id="test-scatter-id" />
        <XAxis allowDataOverflow />
        {props.children}
      </ScatterChart>
    ));

    it("should pass id prop to an element in the DOM", () => {
      const { container } = renderTestCase();

      const scatter = container.querySelector("#test-scatter-id");
      assertNotNull(scatter);
      expect(scatter.tagName).toBe("g");
      expect(scatter.classList.value).toBe("recharts-layer recharts-scatter");
    });
  });

  describe("events", () => {
    // recharts uses userEvent.click; the established Solid harness convention swaps
    // userEvent → fireEvent.click (the dispatch hook fires (data, index, event)).
    it("should fire onClick event when clicking on a scatter point", () => {
      const handleClick = vi.fn();
      const { container } = render(() => (
        <ScatterChart width={500} height={500}>
          <Scatter data={data} dataKey="cx" onClick={handleClick} />
        </ScatterChart>
      ));

      const scatterPoints = container.querySelectorAll(".recharts-symbols");
      const firstPoint = scatterPoints[0];
      assertNotNull(firstPoint);
      fireEvent.click(firstPoint);
      expect(handleClick).toHaveBeenCalledTimes(1);
      expectLastCalledWith(
        handleClick,
        {
          cx: 54,
          cy: 467.77777777777777,
          height: 9.0270333367641,
          node: { x: 10, y: 10, z: "-" },
          payload: {
            cx: 10,
            cy: 50,
            payload: { x: 12, y: 23, z: 78 },
            size: 64,
          },
          size: 0,
          tooltipPayload: [
            {
              dataKey: "cx",
              name: undefined,
              payload: {
                cx: 10,
                cy: 50,
                payload: { x: 12, y: 23, z: 78 },
                size: 64,
              },
              type: undefined,
              unit: "",
              value: 10,
              graphicalItemId: expect.stringMatching(/^recharts-scatter-.+/),
            },
            {
              dataKey: "cx",
              name: undefined,
              payload: {
                cx: 10,
                cy: 50,
                payload: { x: 12, y: 23, z: 78 },
                size: 64,
              },
              type: undefined,
              unit: "",
              value: 10,
              graphicalItemId: expect.stringMatching(/^recharts-scatter-.+/),
            },
          ],
          tooltipPosition: { x: 54, y: 467.77777777777777 },
          width: 9.0270333367641,
          x: 49.48648333161795,
          y: 463.2642611093957,
        },
        0,
        expect.any(Object),
      );
    });
  });
});
