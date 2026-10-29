// Not a recharts port: pins when an axis's rendered ticks leave the store. recharts keeps the
// removal in its own effect, keyed on the axis, so its cleanup runs for the axis the effect was
// set up for — when `axisId`/`axisType` change as well as on unmount
// (vendor/recharts-reference/src/cartesian/CartesianAxis.tsx:348-360, next to the dispatching
// effect at :329-346; commit ccdd02a, #7565). A removal that only runs on unmount for the last
// reported id would leave the ticks of every earlier id in the store.
import { createSignal, flush } from "solid-js";
import { describe, expect, it } from "vitest";
import { render } from "@solidjs/testing-library";
import { BarChart, XAxis, YAxis } from "../../../src";
import { useAppStore } from "../../../src/state/hooks";
import type { RechartsStore } from "../../../src/state/store";
import { createSelectorTestCase } from "../../helper/createSelectorTestCase";
import { expectLastCalledWith } from "../../helper/expectLastCalledWith";

const data = [{ x: "x-1" }, { x: "x-2" }, { x: "x-3" }];

describe("renderedTicks of an axis", () => {
  it("only keep the current xAxisId when it changes at runtime", () => {
    const [axisId, setAxisId] = createSignal("a");
    const renderTestCase = createSelectorTestCase((props) => (
      <BarChart width={100} height={100} data={data}>
        <XAxis xAxisId={axisId()} dataKey="x" />
        {props.children}
      </BarChart>
    ));
    const { spy } = renderTestCase((state) => Object.keys(state.renderedTicks.xAxis));
    expectLastCalledWith(spy, ["a"]);

    setAxisId("b");
    flush();
    flush();
    expectLastCalledWith(spy, ["b"]);

    setAxisId("a");
    flush();
    flush();
    expectLastCalledWith(spy, ["a"]);
  });

  it("only keep the current yAxisId when it changes at runtime", () => {
    const [axisId, setAxisId] = createSignal("a");
    const renderTestCase = createSelectorTestCase((props) => (
      <BarChart width={100} height={100} data={data}>
        <YAxis yAxisId={axisId()} />
        {props.children}
      </BarChart>
    ));
    const { spy } = renderTestCase((state) => Object.keys(state.renderedTicks.yAxis));
    expectLastCalledWith(spy, ["a"]);

    setAxisId("b");
    flush();
    flush();
    expectLastCalledWith(spy, ["b"]);
  });

  it("are all removed when the axis unmounts, whichever id it ended on", () => {
    let store: RechartsStore | undefined;
    const StoreProbe = (): null => {
      store = useAppStore();
      return null;
    };
    const [axisId, setAxisId] = createSignal("a");
    const { unmount } = render(() => (
      <BarChart width={100} height={100} data={data}>
        <XAxis xAxisId={axisId()} dataKey="x" />
        <YAxis yAxisId={axisId()} />
        <StoreProbe />
      </BarChart>
    ));
    flush();
    flush();
    expect(Object.keys(store?.state.renderedTicks.xAxis ?? {})).toEqual(["a"]);
    expect(Object.keys(store?.state.renderedTicks.yAxis ?? {})).toEqual(["a"]);

    setAxisId("b");
    flush();
    flush();
    expect(Object.keys(store?.state.renderedTicks.xAxis ?? {})).toEqual(["b"]);
    expect(Object.keys(store?.state.renderedTicks.yAxis ?? {})).toEqual(["b"]);

    unmount();
    flush();
    expect(Object.keys(store?.state.renderedTicks.xAxis ?? {})).toEqual([]);
    expect(Object.keys(store?.state.renderedTicks.yAxis ?? {})).toEqual([]);
  });
});
