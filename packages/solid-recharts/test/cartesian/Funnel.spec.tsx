// Port of recharts 3.8.1 test/cartesian/Funnel.spec.tsx (commit 7a23854).
// Tier A (byte-identical DOM assertions). Harness deltas: React `className` →
// Solid `class`; `<Cell key=…>` → no key (Solid has no list key prop); the
// `rerender(...)` reversed case → a `reversed` signal updated in place (Solid
// reacts to state changes, there is no rerender). The pure `computeFunnelTrapezoids`
// case is unchanged.
import { describe, expect, it } from "vitest";
import { createSignal, flush } from "solid-js";
import { Cell, Funnel, FunnelChart, FunnelProps, FunnelTrapezoidItem, LabelList } from "../../src";
import { showTooltip } from "../component/Tooltip/tooltipTestHelpers";
import { funnelChartMouseHoverTooltipSelector } from "../component/Tooltip/tooltipMouseHoverSelectors";
import { computeFunnelTrapezoids } from "../../src/cartesian/Funnel";
import { render } from "../helper/render";

const data = [
  { value: 100, name: "展现" },
  { value: 80, name: "点击" },
  { value: 50, name: "访问" },
  { value: 40, name: "咨询" },
  { value: 26, name: "订单" },
];

describe("<Funnel />", () => {
  it("Render 5 Trapezoid in a simple funnel", () => {
    const { container } = render(() => (
      <FunnelChart width={500} height={500}>
        <Funnel dataKey="value" data={data} />
      </FunnelChart>
    ));

    expect(container.getElementsByClassName("recharts-funnel-trapezoid")).toHaveLength(data.length);
  });

  it("Render 5 Trapezoid with animation in a simple funnel", () => {
    const { container } = render(() => (
      <FunnelChart width={500} height={500}>
        <Funnel dataKey="value" data={data} isAnimationActive />
      </FunnelChart>
    ));

    expect(container.getElementsByClassName("recharts-funnel-trapezoid")).toHaveLength(data.length);
  });

  it("Can render in a custom component", () => {
    const CustomFunnel = (props: FunnelProps) => {
      return <Funnel {...props} />;
    };

    const { container } = render(() => (
      <FunnelChart width={500} height={500}>
        <CustomFunnel dataKey="value" data={data} isAnimationActive />
      </FunnelChart>
    ));

    expect(container.getElementsByClassName("recharts-funnel-trapezoid")).toHaveLength(data.length);
  });

  it("Renders each data row's `name` as an SVG attribute on the trapezoid path", () => {
    const { container } = render(() => (
      <FunnelChart width={500} height={500}>
        <Funnel dataKey="value" data={data} isAnimationActive={false} />
      </FunnelChart>
    ));

    const paths = container.querySelectorAll(".recharts-funnel-trapezoid path");
    expect(paths).toHaveLength(data.length);
    paths.forEach((path, i) => {
      expect(path.getAttribute("name")).toBe(data[i]?.name);
    });
  });

  it("Don't render any Trapezoid when data is empty", () => {
    const { container } = render(() => (
      <FunnelChart width={500} height={500}>
        <Funnel dataKey="value" data={[]} />
      </FunnelChart>
    ));

    expect(container.getElementsByClassName("recharts-funnel-trapezoid")).toHaveLength(0);
  });

  it("Don't render any Trapezoid when set hide", () => {
    const { container } = render(() => (
      <FunnelChart width={500} height={500}>
        <Funnel dataKey="value" data={data} hide />
      </FunnelChart>
    ));

    expect(container.getElementsByClassName("recharts-funnel-trapezoid")).toHaveLength(0);
  });

  it("active shape in simple funnel", () => {
    const { container } = render(() => (
      <FunnelChart width={500} height={500}>
        <Funnel
          dataKey="value"
          data={data}
          isAnimationActive={false}
          activeShape={(payload: FunnelTrapezoidItem) => (
            <rect
              class="custom-active-shape"
              x={payload.x}
              y={payload.y}
              height={payload.height}
              width={payload.upperWidth}
              fill="red"
              stroke-width="4"
              stroke="#fff"
            />
          )}
        >
          {data.map(() => (
            <Cell />
          ))}
        </Funnel>
      </FunnelChart>
    ));

    expect(container.querySelectorAll(".custom-active-shape")).toHaveLength(0);

    showTooltip(container, funnelChartMouseHoverTooltipSelector);

    expect(container.querySelectorAll(".custom-active-shape")).toHaveLength(1);

    expect(container.getElementsByClassName("recharts-funnel-trapezoid")).toHaveLength(data.length);
  });

  it("Renders funnel custom cell in simple FunnelChart", () => {
    const { container } = render(() => (
      <FunnelChart width={500} height={300}>
        <Funnel dataKey="value" data={data} isAnimationActive={false}>
          {data.map(() => (
            <Cell class="custom-cell" />
          ))}
        </Funnel>
      </FunnelChart>
    ));

    expect(container.getElementsByClassName("recharts-funnel-trapezoid")).toHaveLength(data.length);
  });

  it("Renders funnel custom label in simple FunnelChart", () => {
    const { container } = render(() => (
      <FunnelChart width={500} height={300}>
        <Funnel dataKey="value" data={data} isAnimationActive={false}>
          <LabelList
            position="right"
            fill="#000"
            stroke="#000"
            dataKey="name"
            class="custom-label"
          />
        </Funnel>
      </FunnelChart>
    ));

    expect(container.getElementsByClassName("recharts-funnel-trapezoid")).toHaveLength(data.length);
    expect(container.querySelectorAll(".custom-label")).toHaveLength(data.length);
  });

  it("should assert the differences between a normal and reversed Funnel", () => {
    const [reversed, setReversed] = createSignal(false);
    const { container } = render(() => (
      <FunnelChart width={500} height={300}>
        <Funnel dataKey="value" data={data} isAnimationActive={false} reversed={reversed()} />
      </FunnelChart>
    ));

    expect(container.getElementsByClassName("recharts-funnel-trapezoid")).toHaveLength(data.length);
    const firstTrapezoid = container.getElementsByClassName("recharts-trapezoid")[0]!;
    expect(firstTrapezoid.getAttribute("x")).toEqual("5");
    expect(firstTrapezoid.getAttribute("y")).toEqual("5");

    // add the reversed prop (Solid reacts to the state change; flush the deferred
    // propagation so the recomputed trapezoids are committed to the DOM)
    setReversed(true);
    flush();

    expect(container.getElementsByClassName("recharts-funnel-trapezoid")).toHaveLength(data.length);
    const firstTrapezoidReversed = container.getElementsByClassName("recharts-trapezoid")[0]!;
    expect(firstTrapezoidReversed.getAttribute("x")).toEqual("54");
    expect(firstTrapezoidReversed.getAttribute("y")).toEqual("237");
  });

  it("should not produce NaN when all data values are 0", () => {
    const zeroData = [
      { value: 0, name: "A" },
      { value: 0, name: "B" },
      { value: 0, name: "C" },
    ];
    const offset = {
      left: 10,
      top: 20,
      width: 400,
      height: 300,
      right: 10,
      bottom: 10,
      brushBottom: 0,
    };

    const trapezoids = computeFunnelTrapezoids({
      dataKey: "value",
      nameKey: "name",
      displayedData: zeroData,
      tooltipType: undefined,
      lastShapeType: "triangle",
      reversed: false,
      offset,
      customWidth: undefined,
      graphicalItemId: "test-funnel",
    });

    expect(trapezoids).toHaveLength(zeroData.length);

    trapezoids.forEach((trapezoid) => {
      expect(trapezoid.x).toBe(offset.left);
      expect(trapezoid.upperWidth).toBe(0);
      expect(trapezoid.lowerWidth).toBe(0);
      expect(Number.isFinite(trapezoid.x)).toBe(true);
      expect(Number.isFinite(trapezoid.y)).toBe(true);
      expect(Number.isFinite(trapezoid.upperWidth)).toBe(true);
      expect(Number.isFinite(trapezoid.lowerWidth)).toBe(true);
      expect(Number.isFinite(trapezoid.height)).toBe(true);
    });
  });
});
