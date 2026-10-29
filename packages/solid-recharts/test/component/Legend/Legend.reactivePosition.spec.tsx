// Not a recharts port: pins that <Legend>'s `position` and `portal` stay reactive.
// recharts re-renders on a prop change and, because the size dispatcher is part of the
// legend element, reports the legend's measured size only while the legend "reports
// dimensions" (vendor/recharts-reference/src/component/Legend.tsx:304-305,
// `portal == null && (position == null || isOutsidePosition(position))`, and :376,
// `{shouldReportDimensions && <LegendSizeDispatcher {...lastBoundingBox} />}`), and
// resets the size to 0 when that dispatcher unmounts (:251-255). The Solid port must
// reach the same plot area when the props change over time.
import { createSignal, flush } from "solid-js";
import { describe, it } from "vitest";
import { Legend, Line, LineChart } from "../../../src";
import type { CartesianPosition } from "../../../src/cartesian/getCartesianPosition";
import { usePlotArea } from "../../../src/hooks";
import { selectLegendSize } from "../../../src/state/selectors/legendSelectors";
import { createSelectorTestCase } from "../../helper/createSelectorTestCase";
import { expectLastCalledWith } from "../../helper/expectLastCalledWith";
import { mockGetBoundingClientRect } from "../../helper/mockGetBoundingClientRect";
import { numericalData } from "../../_data";

// The 500x500 chart has the default 5px margin on every side; the mocked legend box is
// 100x20, so an outside "top" legend pushes the plot area down by 20.
const insidePlotArea = { x: 5, y: 5, width: 490, height: 490 };
const reservedTopPlotArea = { x: 5, y: 25, width: 490, height: 470 };

describe("Legend reactive position", () => {
  it("reserves the measured legend size when position changes from an inside to an outside position", () => {
    mockGetBoundingClientRect({ width: 100, height: 20 });
    const [position, setPosition] = createSignal<CartesianPosition>("insideTop");
    const renderTestCase = createSelectorTestCase((props) => (
      <LineChart width={500} height={500} data={numericalData}>
        <Legend position={position()} />
        <Line dataKey="value" />
        {props.children}
      </LineChart>
    ));
    const { spy } = renderTestCase(usePlotArea);

    // An inside legend does not take any room from the plot area.
    expectLastCalledWith(spy, insidePlotArea);

    setPosition("top");
    flush();
    flush();
    expectLastCalledWith(spy, reservedTopPlotArea);
  });

  it("releases the reserved size when position changes from an outside to an inside position", () => {
    mockGetBoundingClientRect({ width: 100, height: 20 });
    const [position, setPosition] = createSignal<CartesianPosition>("top");
    const renderTestCase = createSelectorTestCase((props) => (
      <LineChart width={500} height={500} data={numericalData}>
        <Legend position={position()} />
        <Line dataKey="value" />
        {props.children}
      </LineChart>
    ));
    const { spy } = renderTestCase(usePlotArea);

    expectLastCalledWith(spy, reservedTopPlotArea);

    setPosition("insideTop");
    flush();
    flush();
    expectLastCalledWith(spy, insidePlotArea);
  });

  it("resets the reported legend size to 0 once the legend stops reporting dimensions", () => {
    mockGetBoundingClientRect({ width: 100, height: 20 });
    const [position, setPosition] = createSignal<CartesianPosition>("top");
    const renderTestCase = createSelectorTestCase((props) => (
      <LineChart width={500} height={500} data={numericalData}>
        <Legend position={position()} />
        <Line dataKey="value" />
        {props.children}
      </LineChart>
    ));
    const { spy } = renderTestCase(selectLegendSize);

    expectLastCalledWith(spy, { width: 100, height: 20 });

    setPosition("insideTop");
    flush();
    flush();
    expectLastCalledWith(spy, { width: 0, height: 0 });

    setPosition("bottom");
    flush();
    flush();
    expectLastCalledWith(spy, { width: 100, height: 20 });
  });

  it("stops reserving the legend size when a portal is supplied later, and resumes when it is removed", () => {
    mockGetBoundingClientRect({ width: 100, height: 20 });
    const target = document.createElement("div");
    document.body.appendChild(target);
    try {
      const [portal, setPortal] = createSignal<HTMLElement | undefined>(undefined);
      const renderTestCase = createSelectorTestCase((props) => (
        <LineChart width={500} height={500} data={numericalData}>
          <Legend position="top" portal={portal()} />
          <Line dataKey="value" />
          {props.children}
        </LineChart>
      ));
      const { spy } = renderTestCase(usePlotArea);

      expectLastCalledWith(spy, reservedTopPlotArea);

      setPortal(target);
      flush();
      flush();
      expectLastCalledWith(spy, insidePlotArea);

      setPortal(undefined);
      flush();
      flush();
      expectLastCalledWith(spy, reservedTopPlotArea);
    } finally {
      target.remove();
    }
  });
});
