import { createEffect } from "solid-js";
import { describe, expect, it, vi } from "vitest";
import { BarChart, Brush, Line, LineChart, XAxis } from "../../../src";
import { useIsPanorama } from "../../../src/context/PanoramaContext";
import {
  selectAllAppliedValues,
  selectAxisDomain,
  selectDisplayedData,
} from "../../../src/state/selectors/axisSelectors";
import { defaultAxisId } from "../../../src/state/cartesianAxisSlice";
import type { RechartsRootState } from "../../../src/state/store";
import { createRechartsStore } from "../../../src/state/store";
import {
  shouldReturnFromInitialState,
  shouldReturnUndefinedOutOfContext,
  useAppSelectorWithStableTest,
} from "../../helper/selectorTestHelpers";
import { expectLastCalledWith } from "../../helper/expectLastCalledWith";
import { render } from "@solidjs/testing-library";

const data1 = [
  { label: "Iter: 0", x: 211, y: 481, z: 1798 },
  { label: "Iter: 1", x: 245, y: 672, z: 1087 },
  { label: "Iter: 2", x: 266, y: 721, z: 1631 },
  { label: "Iter: 3", x: 140, y: 446, z: 1932 },
  { label: "Iter: 4", x: 131, y: 598, z: 1184 },
];

const data2 = [
  { label: "Iter: 5", x: 280, y: 774, z: 1811 },
  { label: "Iter: 6", x: 294, y: 687, z: 1229 },
  { label: "Iter: 7", x: 239, y: 762, z: 1410 },
  { label: "Iter: 8", x: 293, y: 439, z: 1557 },
  { label: "Iter: 9", x: 244, y: 569, z: 1305 },
];

const mockData = [...data1, ...data2];

describe("selectDisplayedData", () => {
  const selector = (state: RechartsRootState) =>
    selectDisplayedData(state, "xAxis", defaultAxisId, false);

  shouldReturnUndefinedOutOfContext(selector);
  shouldReturnFromInitialState(selector, []);

  it("should return empty in an empty chart", () => {
    const spy = vi.fn();
    const Comp = () => {
      const result = useAppSelectorWithStableTest(selector);
      createEffect(() => {
        const value = (() => result())();
        ((value) => spy(value))(value);
      });
      return null;
    };
    render(() => (
      <BarChart width={100} height={100}>
        <Comp />
      </BarChart>
    ));
    expectLastCalledWith(spy, []);
  });

  it("should return the original data if there is no axis with matching ID", () => {
    const spy = vi.fn();
    const Comp = () => {
      const result = useAppSelectorWithStableTest(selector);
      createEffect(() => {
        const value = (() => result())();
        ((value) => spy(value))(value);
      });
      return null;
    };
    render(() => (
      <LineChart width={100} height={100}>
        <Line data={data1} />
        <Line data={data2} />
        <Comp />
      </LineChart>
    ));
    expectLastCalledWith(spy, mockData);
  });

  it("should not recompute when an irrelevant property in the state changes", () => {
    const store = createRechartsStore();
    const result1 = selectDisplayedData(store.state, "xAxis", "0", false);
    store.actions.legend.setLegendSize({ width: 10, height: 20 });
    const result2 = selectDisplayedData(store.state, "xAxis", "0", false);
    expect(result1).toEqual(result2);
  });

  it("should return the original data if there is no axis with matching ID but graphical items have dataKeys", () => {
    const spy = vi.fn();
    const Comp = () => {
      const result = useAppSelectorWithStableTest(selector);
      createEffect(() => {
        const value = (() => result())();
        ((value) => spy(value))(value);
      });
      return null;
    };
    render(() => (
      <LineChart width={100} height={100}>
        <Line dataKey="x" data={data1} />
        <Line dataKey="y" data={data2} />
        <Comp />
      </LineChart>
    ));
    expectLastCalledWith(spy, mockData);
  });

  it("should return data defined in all graphical items based on the input dataKey, and default axis ID", () => {
    const spy = vi.fn();
    const Comp = () => {
      const isPanorama = useIsPanorama();
      const result = useAppSelectorWithStableTest((state) =>
        selectAllAppliedValues(state, "xAxis", defaultAxisId, isPanorama),
      );
      createEffect(() => {
        const value = (() => result())();
        ((value) => spy(value))(value);
      });
      return null;
    };
    render(() => (
      <LineChart width={100} height={100}>
        <Line data={data1} />
        <Line data={data2} />
        <XAxis dataKey="x" />
        <Comp />
      </LineChart>
    ));
    expectLastCalledWith(spy, [
      { value: 211 },
      { value: 245 },
      { value: 266 },
      { value: 140 },
      { value: 131 },
      { value: 280 },
      { value: 294 },
      { value: 239 },
      { value: 293 },
      { value: 244 },
    ]);
  });

  it("should return data defined in graphical items with matching axis ID", () => {
    const displayedDataSpy1 = vi.fn();
    const displayedDataSpy2 = vi.fn();
    const axisDomainSpy1 = vi.fn();
    const axisDomainSpy2 = vi.fn();
    const Comp = () => {
      const isPanorama = useIsPanorama();
      const displayed1 = useAppSelectorWithStableTest((state) =>
        selectDisplayedData(state, "xAxis", "my axis id", isPanorama),
      );
      const displayed2 = useAppSelectorWithStableTest((state) =>
        selectDisplayedData(state, "xAxis", "some other ID", isPanorama),
      );
      const domain1 = useAppSelectorWithStableTest((state) =>
        selectAxisDomain(state, "xAxis", "my axis id", isPanorama),
      );
      const domain2 = useAppSelectorWithStableTest((state) =>
        selectAxisDomain(state, "xAxis", "some other ID", isPanorama),
      );
      createEffect(() => {
        const value = (() => displayed1())();
        ((value) => displayedDataSpy1(value))(value);
      });
      createEffect(() => {
        const value = (() => displayed2())();
        ((value) => displayedDataSpy2(value))(value);
      });
      createEffect(() => {
        const value = (() => domain1())();
        ((value) => axisDomainSpy1(value))(value);
      });
      createEffect(() => {
        const value = (() => domain2())();
        ((value) => axisDomainSpy2(value))(value);
      });
      return null;
    };
    render(() => (
      <LineChart width={100} height={100}>
        <Line data={data2} xAxisId="my axis id" />
        <XAxis dataKey="x" xAxisId="my axis id" />
        <Line data={data1} xAxisId="some other ID" />
        <XAxis dataKey="y" xAxisId="some other ID" />
        <Comp />
      </LineChart>
    ));
    expectLastCalledWith(axisDomainSpy1, [280, 294, 239, 293, 244]);
    expectLastCalledWith(axisDomainSpy2, [481, 672, 721, 446, 598]);
    expectLastCalledWith(displayedDataSpy1, data2);
    expectLastCalledWith(displayedDataSpy2, data1);
  });

  it("should gather data from all graphical items that match the axis ID", () => {
    const displayedDataSpy = vi.fn();
    const Comp = () => {
      const result = useAppSelectorWithStableTest(selector);
      createEffect(() => {
        const value = (() => result())();
        ((value) => displayedDataSpy(value))(value);
      });
      return null;
    };
    render(() => (
      <LineChart width={100} height={100}>
        <Line data={data1} />
        <Line data={data2} />
        <XAxis dataKey="y" />
        <Comp />
      </LineChart>
    ));
    expectLastCalledWith(displayedDataSpy, mockData);
  });

  it("should return data defined in the chart root", () => {
    const spy = vi.fn();
    const Comp = () => {
      const result = useAppSelectorWithStableTest(selector);
      createEffect(() => {
        const value = (() => result())();
        ((value) => spy(value))(value);
      });
      return null;
    };
    render(() => (
      <LineChart data={data1} width={100} height={100}>
        <Line />
        <XAxis dataKey="x" />
        <Comp />
      </LineChart>
    ));
    expectLastCalledWith(spy, data1);
  });

  it("should return data defined in the chart root regardless of the axis ID match", () => {
    const displayedDataSpy = vi.fn();
    const Comp = () => {
      const isPanorama = useIsPanorama();
      const result = useAppSelectorWithStableTest((state) =>
        selectDisplayedData(state, "xAxis", "axis with this ID is not present", isPanorama),
      );
      createEffect(() => {
        const value = (() => result())();
        ((value) => displayedDataSpy(value))(value);
      });
      return null;
    };
    render(() => (
      <LineChart data={data1} width={100} height={100}>
        <Comp />
        <XAxis dataKey="x" />
      </LineChart>
    ));
    expectLastCalledWith(displayedDataSpy, data1);
  });

  it("should slice chart root data by dataStartIndex and dataEndIndex", () => {
    const spy = vi.fn();
    const Comp = () => {
      const result = useAppSelectorWithStableTest(selector);
      createEffect(() => {
        const value = (() => result())();
        ((value) => spy(value))(value);
      });
      return null;
    };
    render(() => (
      <LineChart data={mockData} width={100} height={100}>
        <Line />
        <Brush startIndex={1} endIndex={4} />
        <XAxis dataKey="x" />
        <Comp />
      </LineChart>
    ));
    expectLastCalledWith(spy, data1.slice(1));
  });
});
