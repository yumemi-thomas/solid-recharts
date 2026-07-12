import { describe, expect, it, vi } from "vitest";
import { createEffect, createSignal, flush, Show } from "solid-js";
import {
  Area,
  Bar,
  BarChart,
  ComposedChart,
  ErrorBar,
  Line,
  LineChart,
  Pie,
  PieChart,
  RadialBar,
  RadialBarChart,
  Scatter,
  ScatterChart,
  XAxis,
  YAxis,
} from "../../../src";
import { defaultAxisId } from "../../../src/state/cartesianAxisSlice";
import {
  mergeDomains,
  selectAllErrorBarSettings,
  selectAxisDomain,
  selectAxisDomainIncludingNiceTicks,
  selectAxisScale,
  selectAxisWithScale,
  selectAllAppliedValues,
  selectCalculatedXAxisPadding,
  selectCartesianGraphicalItemsData,
  selectErrorBarsSettings,
  selectHasBar,
  selectNiceTicks,
  selectNumericalDomain,
  selectSmallestDistanceBetweenValues,
} from "../../../src/state/selectors/axisSelectors";
import type { RechartsRootState, RechartsStore } from "../../../src/state/store";
import type { AxisDomain } from "../../../src/util/types";
import { PageData, misbehavedData } from "../../_data";
import { createSelectorTestCase } from "../../helper/createSelectorTestCase";
import { expectXAxisTicks } from "../../helper/expectAxisTicks";
import { expectLastCalledWithScale } from "../../helper/expectScale";
import { render } from "@solidjs/testing-library";
import { useAppStore } from "../../../src/state/hooks";
import {
  shouldReturnFromInitialState,
  shouldReturnUndefinedOutOfContext,
  useAppSelectorWithStableTest,
} from "../../helper/selectorTestHelpers";

const data1 = [
  { label: "Iter: 0", x: 211, y: 481, z: 1798 },
  { label: "Iter: 1", x: 245, y: 672, z: 1087 },
  { label: "Iter: 2", x: 266, y: 721, z: 1631 },
  { label: "Iter: 3", x: 140, y: 446, z: 1932 },
  { label: "Iter: 4", x: 131, y: 598, z: 1184 },
];

/*
 * Ported from recharts 3.8.1 test/state/selectors/axisSelectors.spec.tsx.
 * Harness changes only: React render spies become createSelectorTestCase +
 * Solid selector accessors; React/reselect render-count assertions are omitted.
 */

describe("axisSelectors", () => {
  describe("selectAxisDomain", () => {
    it("should return undefined if there is no data in the chart", () => {
      const renderTestCase = createSelectorTestCase((props) => (
        <BarChart data={[]} width={100} height={100}>
          <Bar dataKey="uv" />
          <XAxis dataKey="name" />
          {props.children}
        </BarChart>
      ));
      const { container, spy } = renderTestCase((state: RechartsRootState) =>
        selectAxisDomain(state, "xAxis", "0", false),
      );
      expect(spy).toHaveBeenLastCalledWith(undefined);
      expectXAxisTicks(container, []);
    });

    it("should gather data from all graphical items that match the axis ID", () => {
      const data1 = [{ y: 481 }, { y: 672 }, { y: 721 }, { y: 446 }, { y: 598 }];
      const data2 = [{ y: 774 }, { y: 687 }, { y: 762 }, { y: 439 }, { y: 569 }];
      const renderTestCase = createSelectorTestCase((props) => (
        <LineChart width={100} height={100}>
          <Line data={data1} />
          <Line data={data2} />
          <XAxis dataKey="y" />
          {props.children}
        </LineChart>
      ));
      const { spy } = renderTestCase((state: RechartsRootState) =>
        selectAxisDomain(state, "xAxis", defaultAxisId, false),
      );
      expect(spy).toHaveBeenLastCalledWith([481, 672, 721, 446, 598, 774, 687, 762, 439, 569]);
    });

    it("should return nothing for graphical items that do not have any explicit data prop on them", () => {
      const renderTestCase = createSelectorTestCase((props) => (
        <ComposedChart data={PageData} width={100} height={100}>
          <Area dataKey="" />
          <Area dataKey="x" data={[{ x: 10 }, { x: 20 }, { x: 30 }]} />
          <Line />
          <Line data={[{ x: 40 }, { x: 50 }, { x: 60 }]} />
          <Scatter />
          <Scatter data={[{ x: 70 }, { x: 80 }, { x: 90 }]} />
          <XAxis dataKey="x" />
          {props.children}
        </ComposedChart>
      ));
      const { container, spy } = renderTestCase((state: RechartsRootState) =>
        selectAxisDomain(state, "xAxis", defaultAxisId, false),
      );
      expectXAxisTicks(container, [
        { textContent: "10", x: "5", y: "73" },
        { textContent: "20", x: "16.25", y: "73" },
        { textContent: "30", x: "27.5", y: "73" },
        { textContent: "40", x: "38.75", y: "73" },
        { textContent: "50", x: "50", y: "73" },
        { textContent: "60", x: "61.25", y: "73" },
        { textContent: "70", x: "72.5", y: "73" },
        { textContent: "80", x: "83.75", y: "73" },
        { textContent: "90", x: "95", y: "73" },
      ]);
      expect(spy).toHaveBeenLastCalledWith([10, 20, 30, 40, 50, 60, 70, 80, 90]);
    });

    it("should return array indexes if there are multiple graphical items, and no explicit dataKey on the matching XAxis", () => {
      const renderTestCase = createSelectorTestCase((props) => (
        <ComposedChart data={PageData} width={100} height={100}>
          <Area dataKey="" />
          <Area dataKey="x" data={[{ x: 10 }, { x: 20 }, { x: 30 }]} />
          <Line />
          <Line data={[{ x: 40 }, { x: 50 }, { x: 60 }]} />
          <Scatter />
          <Scatter data={[{ x: 70 }, { x: 80 }, { x: 90 }]} />
          <XAxis />
          {props.children}
        </ComposedChart>
      ));
      const { container, spy } = renderTestCase((state: RechartsRootState) =>
        selectAxisDomain(state, "xAxis", defaultAxisId, false),
      );
      expectXAxisTicks(container, [
        { textContent: "0", x: "5", y: "73" },
        { textContent: "1", x: "16.25", y: "73" },
        { textContent: "2", x: "27.5", y: "73" },
        { textContent: "3", x: "38.75", y: "73" },
        { textContent: "4", x: "50", y: "73" },
        { textContent: "5", x: "61.25", y: "73" },
        { textContent: "6", x: "72.5", y: "73" },
        { textContent: "7", x: "83.75", y: "73" },
        { textContent: "8", x: "95", y: "73" },
      ]);
      expect(spy).toHaveBeenLastCalledWith([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    });

    describe("XAxis with type = number", () => {
      it("should return highest and lowest number of the chart root data based on the axis dataKey", () => {
        const renderTestCase = createSelectorTestCase((props) => (
          <BarChart data={PageData} width={100} height={100}>
            <XAxis dataKey="uv" type="number" />
            {props.children}
          </BarChart>
        ));
        const { container, spy } = renderTestCase((state: RechartsRootState) =>
          selectAxisDomain(state, "xAxis", "0", false),
        );
        expect(spy).toHaveBeenLastCalledWith([0, 400]);
        expectXAxisTicks(container, [
          { textContent: "0", x: "5", y: "73" },
          { textContent: "100", x: "27.5", y: "73" },
          { textContent: "200", x: "50", y: "73" },
          { textContent: "300", x: "72.5", y: "73" },
          { textContent: "400", x: "95", y: "73" },
        ]);
      });

      it("should return undefined if the data is not numerical", () => {
        const renderTestCase = createSelectorTestCase((props) => (
          <BarChart data={PageData} width={100} height={100}>
            <XAxis dataKey="name" type="number" />
            {props.children}
          </BarChart>
        ));
        const { container, spy } = renderTestCase((state: RechartsRootState) =>
          selectAxisDomain(state, "xAxis", "0", false),
        );
        expect(spy).toHaveBeenLastCalledWith(undefined);
        expectXAxisTicks(container, []);
      });

      it("should not throw an error when the data includes a Symbol", () => {
        const data = [{ x: Symbol.for("unit test") }];
        const renderTestCase = createSelectorTestCase((props) => (
          <BarChart data={data} width={100} height={100}>
            <XAxis dataKey="x" type="number" />
            {props.children}
          </BarChart>
        ));
        expect(() =>
          renderTestCase((state: RechartsRootState) => selectAxisDomain(state, "xAxis", 0, false)),
        ).not.toThrow();
      });

      it("should parse strings, and ignore values that are not numbers", () => {
        const data = [
          { x: "100" },
          { x: "9999" },
          { x: 200 },
          { x: 300 },
          { x: null },
          { x: undefined },
          { x: NaN },
          { x: {} },
          { x: [] },
          { x: () => undefined },
        ];
        const renderTestCase = createSelectorTestCase((props) => (
          <BarChart data={data} width={100} height={100}>
            <XAxis dataKey="x" type="number" />
            {props.children}
          </BarChart>
        ));
        const { container, spy } = renderTestCase((state: RechartsRootState) =>
          selectAxisDomain(state, "xAxis", "0", false),
        );
        expect(spy).toHaveBeenLastCalledWith([0, 9999]);
        expectXAxisTicks(container, [
          { textContent: "0", x: "5", y: "73" },
          { textContent: "2500", x: "27.5", y: "73" },
          { textContent: "5000", x: "50", y: "73" },
          { textContent: "7500", x: "72.5", y: "73" },
          { textContent: "10000", x: "95", y: "73" },
        ]);
      });
    });

    describe.each(["category", undefined] as const)("XAxis with type = %s", (type) => {
      it("should return all strings", () => {
        const renderTestCase = createSelectorTestCase((props) => (
          <BarChart data={PageData} width={100} height={100}>
            <XAxis dataKey="name" type={type} />
            {props.children}
          </BarChart>
        ));
        const { container, spy } = renderTestCase((state: RechartsRootState) =>
          selectAxisDomain(state, "xAxis", "0", false),
        );
        expect(spy).toHaveBeenLastCalledWith([
          "Page A",
          "Page B",
          "Page C",
          "Page D",
          "Page E",
          "Page F",
        ]);
        expectXAxisTicks(container, [
          { textContent: "Page A", x: "12.5", y: "73" },
          { textContent: "Page B", x: "27.5", y: "73" },
          { textContent: "Page C", x: "42.5", y: "73" },
          { textContent: "Page D", x: "57.5", y: "73" },
          { textContent: "Page E", x: "72.5", y: "73" },
          { textContent: "Page F", x: "87.5", y: "73" },
        ]);
      });

      it.each([true, undefined])(
        "should return domain as array indexes when allowDuplicatedCategory = %s",
        (allowDuplicatedCategory) => {
          const renderTestCase = createSelectorTestCase((props) => (
            <BarChart data={PageData} width={100} height={100}>
              <XAxis dataKey="uv" type={type} allowDuplicatedCategory={allowDuplicatedCategory} />
              {props.children}
            </BarChart>
          ));
          const { container, spy } = renderTestCase((state: RechartsRootState) =>
            selectAxisDomain(state, "xAxis", "0", false),
          );
          expect(spy).toHaveBeenLastCalledWith([0, 1, 2, 3, 4, 5]);
          expectXAxisTicks(container, [
            { textContent: "400", x: "12.5", y: "73" },
            { textContent: "300", x: "27.5", y: "73" },
            { textContent: "300", x: "42.5", y: "73" },
            { textContent: "200", x: "57.5", y: "73" },
            { textContent: "278", x: "72.5", y: "73" },
            { textContent: "189", x: "87.5", y: "73" },
          ]);
        },
      );

      it("should filter out duplicates when allowDuplicatedCategory = false", () => {
        const renderTestCase = createSelectorTestCase((props) => (
          <BarChart data={PageData} width={100} height={100}>
            <XAxis dataKey="uv" type={type} allowDuplicatedCategory={false} />
            {props.children}
          </BarChart>
        ));
        const { container, spy } = renderTestCase((state: RechartsRootState) =>
          selectAxisDomain(state, "xAxis", "0", false),
        );
        expect(spy).toHaveBeenLastCalledWith([400, 300, 200, 278, 189]);
        expectXAxisTicks(container, [
          { textContent: "400", x: "14", y: "73" },
          { textContent: "300", x: "32", y: "73" },
          { textContent: "200", x: "50", y: "73" },
          { textContent: "278", x: "68", y: "73" },
          { textContent: "189", x: "86", y: "73" },
        ]);
      });

      it("with allowDuplicatedCategory=true, and the data has duplicates, it should return domain as array indexes", () => {
        const monthsWithDuplicatesData = [
          { x: "Jan" },
          { x: "Jan" },
          { x: "Feb" },
          { x: "Feb" },
          { x: "Mar" },
          { x: "Mar" },
          { x: "Apr" },
          { x: "Apr" },
          { x: "May" },
          { x: "May" },
          { x: "Jun" },
          { x: "Jun" },
          { x: "Jul" },
          { x: "Jul" },
          { x: "Aug" },
          { x: "Aug" },
        ];
        const renderTestCase = createSelectorTestCase((props) => (
          <BarChart data={monthsWithDuplicatesData} width={100} height={100}>
            <XAxis dataKey="x" type={type} allowDuplicatedCategory />
            {props.children}
          </BarChart>
        ));
        const { container, spy } = renderTestCase((state: RechartsRootState) =>
          selectAxisDomain(state, "xAxis", "0", false),
        );
        expect(spy).toHaveBeenLastCalledWith([
          0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
        ]);
        expectXAxisTicks(container, [
          { textContent: "Jan", x: "7.8125", y: "73" },
          { textContent: "Jan", x: "13.4375", y: "73" },
          { textContent: "Feb", x: "19.0625", y: "73" },
          { textContent: "Feb", x: "24.6875", y: "73" },
          { textContent: "Mar", x: "30.3125", y: "73" },
          { textContent: "Mar", x: "35.9375", y: "73" },
          { textContent: "Apr", x: "41.5625", y: "73" },
          { textContent: "Apr", x: "47.1875", y: "73" },
          { textContent: "May", x: "52.8125", y: "73" },
          { textContent: "May", x: "58.4375", y: "73" },
          { textContent: "Jun", x: "64.0625", y: "73" },
          { textContent: "Jun", x: "69.6875", y: "73" },
          { textContent: "Jul", x: "75.3125", y: "73" },
          { textContent: "Jul", x: "80.9375", y: "73" },
          { textContent: "Aug", x: "86.5625", y: "73" },
          { textContent: "Aug", x: "92.1875", y: "73" },
        ]);
      });

      it("with allowDuplicatedCategory=true, and the data has duplicates that are not strings, it should return domain of values", () => {
        const renderTestCase = createSelectorTestCase((props) => (
          <BarChart data={misbehavedData} width={100} height={100}>
            <XAxis dataKey="x" type={type} allowDuplicatedCategory />
            {props.children}
          </BarChart>
        ));
        const { container, spy: domainSpy } = renderTestCase((state: RechartsRootState) =>
          selectAxisDomainIncludingNiceTicks(state, "xAxis", 0, false),
        );
        const { spy: scaleSpy } = renderTestCase((state: RechartsRootState) =>
          selectAxisScale(state, "xAxis", 0, false),
        );
        expect(domainSpy).toHaveBeenLastCalledWith([
          "Jan",
          "Feb",
          "Mar",
          "Apr",
          "May",
          "Jun",
          "Jul",
          "Aug",
        ]);
        expectLastCalledWithScale(scaleSpy, {
          domain: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"],
          range: [5, 95],
        });
        expectXAxisTicks(container, [
          { textContent: "Jan", x: "10.625", y: "73" },
          { textContent: "Feb", x: "21.875", y: "73" },
          { textContent: "Mar", x: "33.125", y: "73" },
          { textContent: "Apr", x: "44.375", y: "73" },
          { textContent: "May", x: "55.625", y: "73" },
          { textContent: "Jun", x: "66.875", y: "73" },
          { textContent: "Jul", x: "78.125", y: "73" },
          { textContent: "Aug", x: "89.375", y: "73" },
        ]);
      });

      it("with allowDuplicatedCategory=true, but the data has no duplicates, it should return domain as strings", () => {
        const data = [
          { x: "Jan" },
          { x: "Feb" },
          { x: "Mar" },
          { x: "Apr" },
          { x: "May" },
          { x: "Jun" },
        ];
        const renderTestCase = createSelectorTestCase((props) => (
          <BarChart data={data} width={100} height={100}>
            <XAxis dataKey="x" type={type} allowDuplicatedCategory />
            {props.children}
          </BarChart>
        ));
        const { container, spy } = renderTestCase((state: RechartsRootState) =>
          selectAxisDomain(state, "xAxis", "0", false),
        );
        expect(spy).toHaveBeenLastCalledWith(["Jan", "Feb", "Mar", "Apr", "May", "Jun"]);
        expectXAxisTicks(container, [
          { textContent: "Jan", x: "12.5", y: "73" },
          { textContent: "Feb", x: "27.5", y: "73" },
          { textContent: "Mar", x: "42.5", y: "73" },
          { textContent: "Apr", x: "57.5", y: "73" },
          { textContent: "May", x: "72.5", y: "73" },
          { textContent: "Jun", x: "87.5", y: "73" },
        ]);
      });

      it("with allowDuplicatedCategory=false, should return domain as deduplicated strings", () => {
        const renderTestCase = createSelectorTestCase((props) => (
          <BarChart data={misbehavedData} width={100} height={100}>
            <XAxis dataKey="x" type={type} allowDuplicatedCategory={false} />
            {props.children}
          </BarChart>
        ));
        const { container, spy } = renderTestCase((state: RechartsRootState) =>
          selectAxisDomain(state, "xAxis", "0", false),
        );
        expect(spy).toHaveBeenLastCalledWith([
          "Jan",
          "Feb",
          "Mar",
          "Apr",
          "May",
          "Jun",
          "Jul",
          "Aug",
        ]);
        expectXAxisTicks(container, [
          { textContent: "Jan", x: "10.625", y: "73" },
          { textContent: "Feb", x: "21.875", y: "73" },
          { textContent: "Mar", x: "33.125", y: "73" },
          { textContent: "Apr", x: "44.375", y: "73" },
          { textContent: "May", x: "55.625", y: "73" },
          { textContent: "Jun", x: "66.875", y: "73" },
          { textContent: "Jul", x: "78.125", y: "73" },
          { textContent: "Aug", x: "89.375", y: "73" },
        ]);
      });

      it("should return array indexes if dataKey is undefined", () => {
        const data = [{ x: "Monday" }, { x: "Tuesday" }, { x: "Wednesday" }];
        const renderTestCase = createSelectorTestCase((props) => (
          <BarChart data={data} width={100} height={100}>
            <XAxis type={type} allowDuplicatedCategory={false} />
            {props.children}
          </BarChart>
        ));
        const { container, spy } = renderTestCase((state: RechartsRootState) =>
          selectAxisDomain(state, "xAxis", "0", false),
        );
        expect(spy).toHaveBeenLastCalledWith([0, 1, 2]);
        expectXAxisTicks(container, [
          { textContent: "0", x: "20", y: "73" },
          { textContent: "1", x: "50", y: "73" },
          { textContent: "2", x: "80", y: "73" },
        ]);
      });
    });
  });
});

describe("selectHasBar", () => {
  it("should return true if there is a Bar in the chart", () => {
    const [showBar, setShowBar] = createSignal(true);
    const renderTestCase = createSelectorTestCase((props) => (
      <BarChart data={PageData} width={100} height={100}>
        <Show when={showBar()}>
          <Bar dataKey="uv" />
        </Show>
        {props.children}
      </BarChart>
    ));
    const { container, spy } = renderTestCase(selectHasBar);
    expect(container.querySelector(".recharts-bar")).toBeVisible();
    expect(spy).toHaveBeenLastCalledWith(true);

    setShowBar(false);
    flush();
    expect(container.querySelector(".recharts-bar")).toBeNull();
    expect(spy).toHaveBeenLastCalledWith(false);
  });

  it("should return false if there is no Bar in the chart", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <BarChart data={PageData} width={100} height={100}>
        <Line dataKey="uv" />
        {props.children}
      </BarChart>
    ));
    const { container, spy } = renderTestCase(selectHasBar);
    expect(container.querySelector(".recharts-bar")).toBeNull();
    expect(spy).toHaveBeenLastCalledWith(false);
  });

  it("should return true if there are two Bars in the chart and then I remove one", () => {
    let store: RechartsStore | undefined;
    const StoreCapture = (): null => {
      store = useAppStore();
      return null;
    };
    const { container, unmount } = render(() => (
      <BarChart data={PageData} width={100} height={100}>
        <Bar dataKey="uv" />
        <Bar dataKey="pv" />
        <StoreCapture />
      </BarChart>
    ));
    flush();
    if (store == null) {
      throw new Error("Expected BarChart to provide a Recharts store");
    }
    expect(container.querySelectorAll(".recharts-bar")).toHaveLength(2);
    expect(selectHasBar(store.state)).toBe(true);

    unmount();
    // The next render's <StoreCapture> reassigns `store`; no manual reset (which would
    // narrow the type to `undefined`, then `never` after the null-check below).
    const oneBar = render(() => (
      <BarChart data={PageData} width={100} height={100}>
        <Bar dataKey="uv" />
        <StoreCapture />
      </BarChart>
    ));
    flush();
    if (store == null) {
      throw new Error("Expected BarChart to provide a Recharts store");
    }
    expect(oneBar.container.querySelectorAll(".recharts-bar")).toHaveLength(1);
    expect(selectHasBar(store.state)).toBe(true);
  });

  it("should return true if there is RadialBar in RadialChart", () => {
    const [showRadialBar, setShowRadialBar] = createSignal(true);
    const spy = vi.fn();
    const Comp = () => {
      const selected = useAppSelectorWithStableTest(selectHasBar);
      createEffect(
        () => selected(),
        (value) => spy(value),
      );
      return null;
    };
    const { container } = render(() => (
      <RadialBarChart data={PageData} width={100} height={100}>
        <Show when={showRadialBar()}>
          <RadialBar dataKey="uv" />
        </Show>
        <Comp />
      </RadialBarChart>
    ));
    flush();
    expect(container.querySelector(".recharts-radial-bar-sectors")).toBeVisible();
    expect(spy).toHaveBeenLastCalledWith(true);

    setShowRadialBar(false);
    flush();
    expect(container.querySelector(".recharts-radial-bar-sectors")).toBeNull();
    expect(spy).toHaveBeenLastCalledWith(false);
  });

  it("should return false if RadialBarChart has no RadialBar in it", () => {
    const spy = vi.fn();
    const Comp = () => {
      const selected = useAppSelectorWithStableTest(selectHasBar);
      createEffect(
        () => selected(),
        (value) => spy(value),
      );
      return null;
    };
    const { container } = render(() => (
      <RadialBarChart data={PageData} width={100} height={100}>
        <Comp />
      </RadialBarChart>
    ));
    flush();
    expect(container.querySelector(".recharts-radial-bar-sectors")).toBeNull();
    expect(spy).toHaveBeenLastCalledWith(false);
  });
});

describe("selectCalculatedPadding", () => {
  it("should return 0 when padding is explicitly provided on XAxis", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <BarChart data={PageData} width={100} height={100}>
        <XAxis dataKey="name" padding={{ left: 11, right: 13 }} />
        {props.children}
      </BarChart>
    ));
    const { spy } = renderTestCase((state: RechartsRootState) =>
      selectCalculatedXAxisPadding(state, 0, false),
    );
    expect(spy).toHaveBeenLastCalledWith(0);
  });

  it('should return a number when padding is "gap"', () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <BarChart data={PageData} width={100} height={100}>
        <XAxis dataKey="pv" padding="gap" type="number" />
        {props.children}
      </BarChart>
    ));
    const { spy } = renderTestCase((state: RechartsRootState) =>
      selectCalculatedXAxisPadding(state, 0, false),
    );
    expect(spy).toHaveBeenLastCalledWith(1.247917162580338);
  });

  it('should return a number when padding is "no-gap"', () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <BarChart data={PageData} width={100} height={100}>
        <XAxis dataKey="pv" padding="no-gap" type="number" />
        {props.children}
      </BarChart>
    ));
    const { spy } = renderTestCase((state: RechartsRootState) =>
      selectCalculatedXAxisPadding(state, 0, false),
    );
    expect(spy).toHaveBeenLastCalledWith(0.9955652016293147);
  });

  it("should return 0 when padding=no-gap and there is only one data point on the chart", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <BarChart data={[PageData[0]]} width={100} height={100}>
        <XAxis dataKey="pv" padding="no-gap" type="number" />
        {props.children}
      </BarChart>
    ));
    const { spy } = renderTestCase((state: RechartsRootState) =>
      selectCalculatedXAxisPadding(state, 0, false),
    );
    expect(spy).toHaveBeenLastCalledWith(0);
  });

  it("should return 0 when padding is an object", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <BarChart data={PageData} width={100} height={100}>
        <XAxis dataKey="pv" padding={{ left: 11, right: 13 }} type="number" />
        {props.children}
      </BarChart>
    ));
    const { spy } = renderTestCase((state: RechartsRootState) =>
      selectCalculatedXAxisPadding(state, 0, false),
    );
    expect(spy).toHaveBeenLastCalledWith(0);
  });
});

describe("selectSmallestDistanceBetweenValues", () => {
  const selector = (state: RechartsRootState) =>
    selectSmallestDistanceBetweenValues(state, "xAxis", 0, false);

  it("should return undefined if there is no data in the chart", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <BarChart data={[]} width={100} height={100}>
        <Bar dataKey="uv" />
        <XAxis dataKey="name" />
        {props.children}
      </BarChart>
    ));
    const { container, spy } = renderTestCase(selector);
    expect(spy).toHaveBeenLastCalledWith(undefined);
    expectXAxisTicks(container, []);
  });

  it.each([undefined, "category"] as const)("should return undefined if XAxis type=%s", (type) => {
    const renderTestCase = createSelectorTestCase((props) => (
      <BarChart data={PageData} width={100} height={100}>
        <Bar dataKey="pv" />
        <XAxis dataKey="name" type={type} />
        {props.children}
      </BarChart>
    ));
    const { spy } = renderTestCase(selector);
    expect(spy).toHaveBeenLastCalledWith(undefined);
  });

  it("should return the smallest distance, in percent, between values if type=number", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <BarChart data={PageData} width={100} height={100}>
        <XAxis dataKey="pv" type="number" />
        {props.children}
      </BarChart>
    ));
    const { spy } = renderTestCase(selector);
    expect(spy).toHaveBeenLastCalledWith(0.02773149250178529);
  });

  it("should return Infinity, if the data is an empty array", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <BarChart data={[]} width={100} height={100}>
        <XAxis dataKey="pv" type="number" />
        {props.children}
      </BarChart>
    ));
    const { spy } = renderTestCase(selector);
    expect(spy).toHaveBeenLastCalledWith(Infinity);
  });

  it("should return Infinity, if the data has only one entry", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <BarChart data={[PageData[0]]} width={100} height={100}>
        <XAxis dataKey="pv" type="number" />
        {props.children}
      </BarChart>
    ));
    const { spy } = renderTestCase(selector);
    expect(spy).toHaveBeenLastCalledWith(Infinity);
  });

  it("should return 0 if the data has two items with the same value", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <BarChart data={PageData} width={100} height={100}>
        <XAxis dataKey="uv" type="number" />
        {props.children}
      </BarChart>
    ));
    const { spy } = renderTestCase(selector);
    expect(spy).toHaveBeenLastCalledWith(0);
  });
});

describe("selectCartesianGraphicalItemsData", () => {
  it("should return empty array in an empty chart", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <BarChart data={PageData} width={100} height={100}>
        {props.children}
      </BarChart>
    ));
    const { spy } = renderTestCase((state: RechartsRootState) =>
      selectCartesianGraphicalItemsData(state, "xAxis", defaultAxisId),
    );
    expect(spy).toHaveBeenLastCalledWith([]);
  });

  it("should return empty array in a chart with root data", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <BarChart data={PageData} width={100} height={100}>
        <Bar dataKey="pv" />
        <Bar dataKey="uv" />
        {props.children}
      </BarChart>
    ));
    const { spy } = renderTestCase((state: RechartsRootState) =>
      selectCartesianGraphicalItemsData(state, "xAxis", defaultAxisId),
    );
    expect(spy).toHaveBeenLastCalledWith([]);
  });

  it("should return all data defined on graphical items", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <ComposedChart data={PageData} width={100} height={100}>
        <Area dataKey="a" data={[{ a: 1 }, { a: 2 }, { a: 3 }]} />
        <Area dataKey="b" data={[{ b: 10 }, { b: 20 }, { c: 30 }]} />
        <Line data={[4, 5, 6]} />
        <Line data={[40, 50, 60]} />
        <Scatter data={[7, 8, 9]} />
        <Scatter data={[70, 80, 90]} />
        {props.children}
      </ComposedChart>
    ));
    const { spy } = renderTestCase((state: RechartsRootState) =>
      selectCartesianGraphicalItemsData(state, "xAxis", defaultAxisId),
    );
    expect(spy).toHaveBeenLastCalledWith(
      expect.arrayContaining([
        7,
        8,
        9,
        70,
        80,
        90,
        { a: 1 },
        { a: 2 },
        { a: 3 },
        { b: 10 },
        { b: 20 },
        { c: 30 },
        4,
        5,
        6,
        40,
        50,
        60,
      ]),
    );
  });

  it("should return nothing for graphical items that do not have any explicit data prop on them", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <ComposedChart data={PageData} width={100} height={100}>
        <Area dataKey="" />
        <Area dataKey="x" data={[{ x: 10 }, { x: 20 }, { x: 30 }]} />
        <Line />
        <Line data={[{ x: 40 }, { x: 50 }, { x: 60 }]} />
        <Scatter />
        <Scatter data={[{ x: 70 }, { x: 80 }, { x: 90 }]} />
        <XAxis />
        {props.children}
      </ComposedChart>
    ));
    const { container, spy } = renderTestCase((state: RechartsRootState) =>
      selectCartesianGraphicalItemsData(state, "xAxis", defaultAxisId),
    );
    expect(spy).toHaveBeenLastCalledWith(
      expect.arrayContaining([
        { x: 70 },
        { x: 80 },
        { x: 90 },
        { x: 10 },
        { x: 20 },
        { x: 30 },
        { x: 40 },
        { x: 50 },
        { x: 60 },
      ]),
    );
    expectXAxisTicks(container, [
      { textContent: "0", x: "5", y: "73" },
      { textContent: "1", x: "16.25", y: "73" },
      { textContent: "2", x: "27.5", y: "73" },
      { textContent: "3", x: "38.75", y: "73" },
      { textContent: "4", x: "50", y: "73" },
      { textContent: "5", x: "61.25", y: "73" },
      { textContent: "6", x: "72.5", y: "73" },
      { textContent: "7", x: "83.75", y: "73" },
      { textContent: "8", x: "95", y: "73" },
    ]);
  });

  it("should not return any data defined on Pies - that one will have its own independent selector", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <PieChart width={100} height={100}>
        <Pie data={[{ x: 1 }, { x: 2 }, { x: 3 }]} dataKey="x" />
        <Pie data={[{ y: 10 }, { y: 20 }, { y: 30 }]} dataKey="y" />
        {props.children}
      </PieChart>
    ));
    const { spy } = renderTestCase((state: RechartsRootState) =>
      selectCartesianGraphicalItemsData(state, "xAxis", defaultAxisId),
    );
    expect(spy).toHaveBeenLastCalledWith([]);
  });
});

describe("selectAllAppliedValues", () => {
  const selector = (state: RechartsRootState) =>
    selectAllAppliedValues(state, "xAxis", defaultAxisId, false);

  it("should return empty array in an empty chart", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <BarChart width={100} height={100}>
        {props.children}
      </BarChart>
    ));
    const { spy } = renderTestCase(selector);
    expect(spy).toHaveBeenLastCalledWith([]);
  });

  it("should return empty array if there is no axis with matching ID", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <LineChart width={100} height={100}>
        <Line />
        {props.children}
      </LineChart>
    ));
    const { spy } = renderTestCase(selector);
    expect(spy).toHaveBeenLastCalledWith([]);
  });

  it("should return all data defined in all graphical items based on the input dataKey, and default axis ID", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <LineChart width={100} height={100}>
        <Line data={[{ x: 1 }, { x: 2 }, { x: 3 }]} />
        <Line data={[{ x: 10 }, { x: 20 }, { x: 30 }]} />
        <XAxis dataKey="x" />
        {props.children}
      </LineChart>
    ));
    const { spy } = renderTestCase(selector);
    expect(spy).toHaveBeenLastCalledWith([
      { value: 1 },
      { value: 2 },
      { value: 3 },
      { value: 10 },
      { value: 20 },
      { value: 30 },
    ]);
  });

  it("should return data defined in the chart root", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <LineChart data={data1} width={100} height={100}>
        <Line />
        <XAxis dataKey="x" />
        {props.children}
      </LineChart>
    ));
    const { spy } = renderTestCase(selector);
    expect(spy).toHaveBeenLastCalledWith([
      { value: 211 },
      { value: 245 },
      { value: 266 },
      { value: 140 },
      { value: 131 },
    ]);
  });

  it("should return values as full input objects if the axis ID does not match anything in the data", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <LineChart data={data1} width={100} height={100}>
        <XAxis dataKey="this dataKey is not present in the input data" />
        {props.children}
      </LineChart>
    ));
    const { spy } = renderTestCase((state: RechartsRootState) =>
      selectAllAppliedValues(state, "xAxis", "axis with this ID is not present", false),
    );
    expect(spy).toHaveBeenLastCalledWith([
      { value: { label: "Iter: 0", x: 211, y: 481, z: 1798 } },
      { value: { label: "Iter: 1", x: 245, y: 672, z: 1087 } },
      { value: { label: "Iter: 2", x: 266, y: 721, z: 1631 } },
      { value: { label: "Iter: 3", x: 140, y: 446, z: 1932 } },
      { value: { label: "Iter: 4", x: 131, y: 598, z: 1184 } },
    ]);
  });
});

describe("selectNiceTicks", () => {
  it("should return undefined in a chart with no XAxis", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <BarChart width={100} height={100}>
        <Bar />
        {props.children}
      </BarChart>
    ));
    const { spy } = renderTestCase((state: RechartsRootState) =>
      selectNiceTicks(state, "xAxis", defaultAxisId, false),
    );
    expect(spy).toHaveBeenLastCalledWith(undefined);
  });

  it("should return undefined if there is no axis with matching ID", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <LineChart width={100} height={100} data={PageData}>
        <Line />
        <XAxis type="number" />
        {props.children}
      </LineChart>
    ));
    const { spy: xAxisSpy } = renderTestCase((state: RechartsRootState) =>
      selectNiceTicks(state, "xAxis", "foo", false),
    );
    const { spy: yAxisSpy } = renderTestCase((state: RechartsRootState) =>
      selectNiceTicks(state, "yAxis", "bar", false),
    );
    expect(xAxisSpy).toHaveBeenLastCalledWith(undefined);
    expect(yAxisSpy).toHaveBeenLastCalledWith(undefined);
  });

  const casesThatProduceNiceTicks: ReadonlyArray<{
    domain: AxisDomain | undefined;
    expectedTicks: ReadonlyArray<number>;
  }> = [
    { domain: undefined, expectedTicks: [0, 100, 200, 300, 400] },
    { domain: ["auto", "auto"], expectedTicks: [180, 240, 300, 360, 420] },
    { domain: [-500, "auto"], expectedTicks: [-500, -250, 0, 250, 500] },
    { domain: ["auto", 3000], expectedTicks: [0, 750, 1500, 2250, 3000] },
  ];

  it.each(casesThatProduceNiceTicks)(
    "should return nice ticks when domain=%s",
    ({ domain, expectedTicks }) => {
      const renderTestCase = createSelectorTestCase((props) => (
        <LineChart width={100} height={100} data={PageData}>
          <Line dataKey="pv" />
          <XAxis type="number" dataKey="uv" domain={domain} />
          {props.children}
        </LineChart>
      ));
      const { spy } = renderTestCase((state: RechartsRootState) =>
        selectNiceTicks(state, "xAxis", defaultAxisId, false),
      );
      expect(spy).toHaveBeenLastCalledWith(expectedTicks);
    },
  );

  it('should return undefined when niceTicks="none", ignoring domain type', () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <LineChart width={100} height={100} data={PageData}>
        <Line dataKey="pv" />
        <XAxis type="number" dataKey="uv" domain={["auto", "auto"]} niceTicks="none" />
        {props.children}
      </LineChart>
    ));
    const { spy } = renderTestCase((state: RechartsRootState) =>
      selectNiceTicks(state, "xAxis", defaultAxisId, false),
    );
    expect(spy).toHaveBeenLastCalledWith(undefined);
  });

  it('should return adaptive ticks (algorithm A) when niceTicks="adaptive"', () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <LineChart width={100} height={100} data={PageData}>
        <Line dataKey="pv" />
        <XAxis type="number" dataKey="uv" domain={["auto", "auto"]} niceTicks="adaptive" />
        {props.children}
      </LineChart>
    ));
    const { spy } = renderTestCase((state: RechartsRootState) =>
      selectNiceTicks(state, "xAxis", defaultAxisId, false),
    );
    expect(spy).toHaveBeenLastCalledWith([180, 240, 300, 360, 420]);
  });

  it('should return round-number snap125 ticks (algorithm B) when niceTicks="snap125"', () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <LineChart width={100} height={100} data={PageData}>
        <Line dataKey="pv" />
        <XAxis type="number" dataKey="uv" domain={["auto", "auto"]} niceTicks="snap125" />
        {props.children}
      </LineChart>
    ));
    const { spy } = renderTestCase((state: RechartsRootState) =>
      selectNiceTicks(state, "xAxis", defaultAxisId, false),
    );
    expect(spy).toHaveBeenLastCalledWith([100, 200, 300, 400, 500]);
  });
});

describe("mergeDomains", () => {
  it("should return undefined when called without domains", () => {
    expect(mergeDomains()).toEqual(undefined);
    expect(mergeDomains(undefined)).toEqual(undefined);
  });

  it("should return the same domain when called with a single domain", () => {
    expect(mergeDomains([100, 200])).toEqual([100, 200]);
    expect(mergeDomains(undefined, [100, 200], undefined)).toEqual([100, 200]);
  });

  it("should find min, max when called with multiple domains", () => {
    expect(mergeDomains([100, 200], [150, 250])).toEqual([100, 250]);
    expect(mergeDomains([100, 200], undefined, [150, 250], [50, 300])).toEqual([50, 300]);
  });

  it("should ignore domains that are undefined", () => {
    expect(mergeDomains([100, 200], [150, 250])).toEqual([100, 250]);
    expect(mergeDomains([100, 200], [150, 250], undefined, [0, 50])).toEqual([0, 250]);
  });
});

describe("selectAxisWithScale", () => {
  it("should return undefined in a chart with no data", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <BarChart width={100} height={100}>
        <Bar />
        {props.children}
      </BarChart>
    ));
    const { spy: xAxisSpy } = renderTestCase((state: RechartsRootState) =>
      selectAxisWithScale(state, "xAxis", defaultAxisId, false),
    );
    const { spy: yAxisSpy } = renderTestCase((state: RechartsRootState) =>
      selectAxisWithScale(state, "yAxis", defaultAxisId, false),
    );
    expect(xAxisSpy).toHaveBeenLastCalledWith(undefined);
    expect(yAxisSpy).toHaveBeenLastCalledWith(undefined);
  });

  describe("in chart with explicit axes", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <LineChart width={100} height={100} data={PageData}>
        <Line dataKey="pv" />
        <XAxis dataKey="name" />
        <YAxis />
        {props.children}
      </LineChart>
    ));

    it("selectNumericalDomain", () => {
      const { spy } = renderTestCase((state: RechartsRootState) =>
        selectNumericalDomain(state, "yAxis", defaultAxisId, false),
      );
      expect(spy).toHaveBeenLastCalledWith([0, 9800]);
    });

    it("selectAxisDomain", () => {
      const { spy } = renderTestCase((state: RechartsRootState) =>
        selectAxisDomain(state, "yAxis", defaultAxisId, false),
      );
      expect(spy).toHaveBeenLastCalledWith([0, 9800]);
    });
  });
});

/*
 * Ported from recharts 3.8.1 axisSelectors.spec.tsx `selectErrorBarsSettings`.
 * Unblocked by the Bar+ErrorBar stable-mount fix (Bar previously crashed/hung
 * with an ErrorBar child). Harness changes only: React Comp+spy → createSelectorTestCase
 * (spies the accessor via an effect). `toHaveBeenCalledTimes(N)` render-count assertions
 * are dropped (Solid's fine-grained reactivity produces a different, non-meaningful count
 * — see big-win-port-map). The two trailing reselect `toBe` reference-stability cases are
 * N/A in this no-reselect Solid rewrite (see selectorTestHelpers header) and omitted.
 */
describe("selectErrorBarsSettings", () => {
  const selector = (state: RechartsRootState) =>
    selectErrorBarsSettings(state, "xAxis", defaultAxisId);

  shouldReturnUndefinedOutOfContext(selector);
  shouldReturnFromInitialState(selector, []);

  it("should return empty array in a chart with no ErrorBars", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <BarChart width={100} height={100}>
        <Bar isAnimationActive={false} />
        {props.children}
      </BarChart>
    ));
    const { spy } = renderTestCase((state: RechartsRootState) =>
      selectErrorBarsSettings(state, "xAxis", defaultAxisId),
    );
    expect(spy).toHaveBeenLastCalledWith([]);
  });

  it("should return empty array if there is no axis with matching ID", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <LineChart width={100} height={100} data={PageData}>
        <Line isAnimationActive={false}>
          <ErrorBar dataKey="data-x" direction="x" />
          <ErrorBar dataKey="data-y" direction="y" />
        </Line>
        <XAxis type="number" />
        {props.children}
      </LineChart>
    ));
    // There are ErrorBars but they are specified for another XAxis
    const { spy: xAxisSpy, unmount } = renderTestCase((state: RechartsRootState) =>
      selectErrorBarsSettings(state, "xAxis", "foo"),
    );
    expect(xAxisSpy).toHaveBeenLastCalledWith([]);
    unmount();
    const { spy: yAxisSpy } = renderTestCase((state: RechartsRootState) =>
      selectErrorBarsSettings(state, "yAxis", "bar"),
    );
    expect(yAxisSpy).toHaveBeenLastCalledWith([]);
  });

  describe("error bars settings", () => {
    describe("in BarChart", () => {
      const renderTestCase = createSelectorTestCase((props) => (
        <BarChart data={[{ x: 1 }, { x: 2 }, { x: 3 }]} width={100} height={100}>
          <Bar dataKey="x" isAnimationActive={false} id="bar-without-error-bars" />
          <Bar dataKey="x" isAnimationActive={false} id="my-bar-id">
            <ErrorBar dataKey="data-x" direction="x" />
            <ErrorBar dataKey="data-y" direction="y" />
          </Bar>
          <XAxis type="number" />
          {props.children}
        </BarChart>
      ));

      it("should select error bar state", () => {
        const { spy } = renderTestCase(selectAllErrorBarSettings);
        expect(spy).toHaveBeenLastCalledWith({
          "my-bar-id": [
            { dataKey: "data-x", direction: "x" },
            { dataKey: "data-y", direction: "y" },
          ],
        });
      });

      it("should return XAxis error bars", () => {
        const { spy } = renderTestCase((state: RechartsRootState) =>
          selectErrorBarsSettings(state, "xAxis", defaultAxisId),
        );
        expect(spy).toHaveBeenLastCalledWith([{ dataKey: "data-x", direction: "x" }]);
      });

      it("should return YAxis error bars", () => {
        const { spy } = renderTestCase((state: RechartsRootState) =>
          selectErrorBarsSettings(state, "yAxis", defaultAxisId),
        );
        expect(spy).toHaveBeenLastCalledWith([{ dataKey: "data-y", direction: "y" }]);
      });
    });

    describe("in LineChart", () => {
      const renderTestCase = createSelectorTestCase((props) => (
        <LineChart width={100} height={100}>
          <Line data={PageData} isAnimationActive={false} dataKey="uv" id="line1" />
          <Line data={PageData} isAnimationActive={false} dataKey="pv" id="line2">
            <ErrorBar dataKey="pv" direction="x" />
            <ErrorBar dataKey="amt" direction="y" />
          </Line>
          <XAxis />
          <YAxis dataKey="uv" />
          {props.children}
        </LineChart>
      ));

      it("should select error bar state", () => {
        const { spy } = renderTestCase(selectAllErrorBarSettings);
        expect(spy).toHaveBeenLastCalledWith({
          line2: [
            { dataKey: "pv", direction: "x" },
            { dataKey: "amt", direction: "y" },
          ],
        });
      });

      it("should return XAxis error bars", () => {
        const { spy } = renderTestCase((state: RechartsRootState) =>
          selectErrorBarsSettings(state, "xAxis", defaultAxisId),
        );
        expect(spy).toHaveBeenLastCalledWith([{ dataKey: "pv", direction: "x" }]);
      });

      it("should return YAxis error bars", () => {
        const { spy } = renderTestCase((state: RechartsRootState) =>
          selectErrorBarsSettings(state, "yAxis", defaultAxisId),
        );
        expect(spy).toHaveBeenLastCalledWith([{ dataKey: "amt", direction: "y" }]);
      });
    });

    describe("in Vertical LineChart", () => {
      const renderTestCase = createSelectorTestCase((props) => (
        <LineChart width={100} height={100} layout="vertical">
          <Line
            data={[{ x: 1 }, { x: 2 }, { x: 3 }]}
            isAnimationActive={false}
            id="line-without-bars"
          />
          <Line
            data={[{ x: 10 }, { x: 20 }, { x: 30 }]}
            isAnimationActive={false}
            dataKey="x"
            id="line-with-error-bars"
          >
            <ErrorBar dataKey="data-x" direction="x" />
            <ErrorBar dataKey="data-y" direction="y" />
          </Line>
          <XAxis />
          <YAxis dataKey="x" />
          {props.children}
        </LineChart>
      ));

      it("should select error bar state", () => {
        const { spy } = renderTestCase(selectAllErrorBarSettings);
        expect(spy).toHaveBeenLastCalledWith({
          "line-with-error-bars": [
            { dataKey: "data-x", direction: "x" },
            { dataKey: "data-y", direction: "y" },
          ],
        });
      });

      it("should return XAxis error bars", () => {
        const { spy } = renderTestCase((state: RechartsRootState) =>
          selectErrorBarsSettings(state, "xAxis", defaultAxisId),
        );
        expect(spy).toHaveBeenLastCalledWith([{ dataKey: "data-x", direction: "x" }]);
      });

      it("should return YAxis error bars", () => {
        const { spy } = renderTestCase((state: RechartsRootState) =>
          selectErrorBarsSettings(state, "yAxis", defaultAxisId),
        );
        expect(spy).toHaveBeenLastCalledWith([{ dataKey: "data-y", direction: "y" }]);
      });
    });

    describe("in ScatterChart", () => {
      const renderTestCase = createSelectorTestCase((props) => (
        <ScatterChart width={100} height={100}>
          <Scatter
            data={[{ x: 1 }, { x: 2 }, { x: 3 }]}
            dataKey="x"
            isAnimationActive={false}
            id="scatter-without-bars"
          />
          <Scatter
            data={[{ x: 10 }, { x: 20 }, { x: 30 }]}
            isAnimationActive={false}
            id="scatter-with-error-bars"
          >
            <ErrorBar dataKey="data-x" direction="x" />
            <ErrorBar dataKey="data-y" direction="y" />
          </Scatter>
          <XAxis />
          <YAxis dataKey="x" />
          {props.children}
        </ScatterChart>
      ));

      it("should select error bar state", () => {
        const { spy } = renderTestCase(selectAllErrorBarSettings);
        expect(spy).toHaveBeenLastCalledWith({
          "scatter-with-error-bars": [
            { dataKey: "data-x", direction: "x" },
            { dataKey: "data-y", direction: "y" },
          ],
        });
      });

      it("should return XAxis error bars", () => {
        const { spy } = renderTestCase((state: RechartsRootState) =>
          selectErrorBarsSettings(state, "xAxis", defaultAxisId),
        );
        expect(spy).toHaveBeenLastCalledWith([{ dataKey: "data-x", direction: "x" }]);
      });

      it("should return YAxis error bars", () => {
        const { spy } = renderTestCase((state: RechartsRootState) =>
          selectErrorBarsSettings(state, "yAxis", defaultAxisId),
        );
        expect(spy).toHaveBeenLastCalledWith([{ dataKey: "data-y", direction: "y" }]);
      });
    });

    describe("in ComposedChart", () => {
      const renderTestCase = createSelectorTestCase((props) => (
        <ComposedChart data={[{ x: 1 }, { x: 2 }, { x: 3 }]} width={100} height={100}>
          <Bar dataKey="x" isAnimationActive={false} id="bar-without-error-bars" />
          <Bar dataKey="x" isAnimationActive={false} id="my-bar-id">
            <ErrorBar dataKey="data-x" direction="x" />
            <ErrorBar dataKey="data-y" direction="y" />
          </Bar>
          <Line
            data={[{ x: 10 }, { x: 20 }, { x: 30 }]}
            isAnimationActive={false}
            id="line-with-error-bars"
          >
            <ErrorBar dataKey="data-x" direction="x" />
            <ErrorBar dataKey="data-y" direction="y" />
          </Line>
          <Scatter
            data={[{ x: 100 }, { x: 200 }, { x: 300 }]}
            isAnimationActive={false}
            id="scatter-with-error-bars"
          >
            <ErrorBar dataKey="data-x" direction="x" />
            <ErrorBar dataKey="data-y" direction="y" />
          </Scatter>
          <XAxis type="number" />
          <YAxis dataKey="x" />
          {props.children}
        </ComposedChart>
      ));

      it("should select error bar state", () => {
        const { spy } = renderTestCase(selectAllErrorBarSettings);
        expect(spy).toHaveBeenLastCalledWith({
          "my-bar-id": [
            { dataKey: "data-x", direction: "x" },
            { dataKey: "data-y", direction: "y" },
          ],
          "line-with-error-bars": [
            { dataKey: "data-x", direction: "x" },
            { dataKey: "data-y", direction: "y" },
          ],
          "scatter-with-error-bars": [
            { dataKey: "data-x", direction: "x" },
            { dataKey: "data-y", direction: "y" },
          ],
        });
      });

      it("should return XAxis error bars", () => {
        const { spy } = renderTestCase((state: RechartsRootState) =>
          selectErrorBarsSettings(state, "xAxis", defaultAxisId),
        );
        expect(spy).toHaveBeenLastCalledWith([
          { dataKey: "data-x", direction: "x" },
          { dataKey: "data-x", direction: "x" },
          { dataKey: "data-x", direction: "x" },
        ]);
      });

      it("should return YAxis error bars", () => {
        const { spy } = renderTestCase((state: RechartsRootState) =>
          selectErrorBarsSettings(state, "yAxis", defaultAxisId),
        );
        expect(spy).toHaveBeenLastCalledWith([
          { dataKey: "data-y", direction: "y" },
          { dataKey: "data-y", direction: "y" },
          { dataKey: "data-y", direction: "y" },
        ]);
      });
    });
  });
});
