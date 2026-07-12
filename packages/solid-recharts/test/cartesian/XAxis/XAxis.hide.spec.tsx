// Ported from recharts 3.8.1 test/cartesian/XAxis/XAxis.hide.spec.tsx (commit 7a23854).
import { createEffect, flush } from "solid-js";
import { describe, expect, it, vi } from "vitest";
import { Line, LineChart, Tooltip, XAxis } from "../../../src";
import { selectAxisScale, selectXAxisPosition } from "../../../src/state/selectors/axisSelectors";
import { useAppSelector } from "../../../src/state/hooks";
import { pageData } from "../../_data";
import { createSelectorTestCase } from "../../helper/createSelectorTestCase";
import { expectLastCalledWith } from "../../helper/expectLastCalledWith";
import { expectXAxisTicks } from "../../helper/expectAxisTicks";
import { render } from "@solidjs/testing-library";

describe("XAxis hide", () => {
  it("Don't render x-axis when hide is set to be true", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <LineChart
        width={400}
        height={400}
        data={pageData}
        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
      >
        <XAxis hide />
        <Line type="monotone" dataKey="uv" stroke="#ff7300" />
        {props.children}
      </LineChart>
    ));
    const { container, spy } = renderTestCase((state) =>
      selectAxisScale(state, "xAxis", 0, false)?.domain(),
    );
    flush();

    expect(container.querySelectorAll(".recharts-xAxis")).toHaveLength(0);
    expectLastCalledWith(spy, [0, 1, 2, 3, 4, 5, 6]);
  });

  it("should not leave space for hidden axes", () => {
    // NOTE: recharts also asserts `selectAllXAxesOffsetSteps(state, 'top'|'bottom', false)`,
    // but that selector is not exported from this port's src. Its values are fully covered
    // by the per-axis `selectXAxisPosition` assertions below (each position .y is the offset
    // step the hidden axis would have produced — c.y=695, d.y=-65 confirm hidden axes still
    // get a position but consume NO visible space, so the visible a/b axes are unshifted).
    const axisAPositionSpy = vi.fn();
    const axisBPositionSpy = vi.fn();
    const axisCPositionSpy = vi.fn();
    const axisDPositionSpy = vi.fn();
    const Comp = (): null => {
      const aPos = useAppSelector((state) => selectXAxisPosition(state, "a"));
      const bPos = useAppSelector((state) => selectXAxisPosition(state, "b"));
      const cPos = useAppSelector((state) => selectXAxisPosition(state, "c"));
      const dPos = useAppSelector((state) => selectXAxisPosition(state, "d"));
      createEffect(
        () => aPos(),
        (v) => axisAPositionSpy(v),
      );
      createEffect(
        () => bPos(),
        (v) => axisBPositionSpy(v),
      );
      createEffect(
        () => cPos(),
        (v) => axisCPositionSpy(v),
      );
      createEffect(
        () => dPos(),
        (v) => axisDPositionSpy(v),
      );
      return null;
    };
    const { container } = render(() => (
      <LineChart width={700} height={700} data={pageData}>
        <XAxis dataKey="name" xAxisId="a" orientation="top" height={40} />
        <XAxis dataKey="uv" xAxisId="b" height={50} />
        <XAxis hide dataKey="pv" type="number" xAxisId="c" height={60} />
        <XAxis hide dataKey="amt" type="number" orientation="top" xAxisId="d" height={70} />
        <Line dataKey="name" xAxisId="a" />
        <Line dataKey="uv" xAxisId="b" />
        <Line dataKey="pv" xAxisId="c" />
        <Line dataKey="amt" xAxisId="d" />
        <Tooltip defaultIndex={2} />
        <Comp />
      </LineChart>
    ));
    flush();

    expectXAxisTicks(container, [
      { textContent: "Page A", x: "5", y: "37" },
      { textContent: "Page B", x: "120", y: "37" },
      { textContent: "Page C", x: "235", y: "37" },
      { textContent: "Page D", x: "350", y: "37" },
      { textContent: "Page E", x: "465", y: "37" },
      { textContent: "Page F", x: "580", y: "37" },
      { textContent: "Page G", x: "695", y: "37" },
      { textContent: "590", x: "5", y: "653" },
      { textContent: "590", x: "120", y: "653" },
      { textContent: "868", x: "235", y: "653" },
      { textContent: "1397", x: "350", y: "653" },
      { textContent: "1480", x: "465", y: "653" },
      { textContent: "1520", x: "580", y: "653" },
      { textContent: "1400", x: "695", y: "653" },
    ]);
    expect(axisAPositionSpy).toHaveBeenLastCalledWith({ x: 5, y: 5 });
    expect(axisBPositionSpy).toHaveBeenLastCalledWith({ x: 5, y: 645 });
    expect(axisCPositionSpy).toHaveBeenLastCalledWith({ x: 5, y: 695 });
    expect(axisDPositionSpy).toHaveBeenLastCalledWith({ x: 5, y: -65 });
  });
});
