// Ported from recharts 3.8.1 test/component/Cursor.spec.tsx (commit 7a23854).
//
// Harness adaptations: React render → Solid render(() => …); standalone renders
// pass `zIndex={0}` to opt out of the default z-index portal (exactly as the
// reference spec does — no portal targets exist outside a real chart surface).
// PERMANENT-N/A: the two
// "should render a custom cursor" cases pass `cursor={<MyCustomCursor/>}` (a React
// element relying on isValidElement/cloneElement) — `CursorDefinition` in the
// Solid port is `boolean | Record<string, unknown>`, with no element form.
import { describe, expect, it } from "vitest";
import { flush } from "solid-js";
import { render } from "@solidjs/testing-library";
import {
  Cursor,
  CursorInternal,
  type CursorConnectedProps,
  type CursorProps,
} from "../../src/component/Cursor";
import { Line, LineChart, Tooltip } from "../../src";
import { DefaultZIndexes } from "../../src/zIndex/DefaultZIndexes";
import { PageData } from "../_data";
import { showTooltip } from "./Tooltip/tooltipTestHelpers";
import { lineChartMouseHoverTooltipSelector } from "./Tooltip/tooltipMouseHoverSelectors";
import { assertNotNull } from "../helper/assertNotNull";
import type { RechartsRootState } from "../../src/state/store";
import { RechartsStoreProvider } from "../../src/state/RechartsStoreProvider";
import { arrayTooltipSearcher } from "../../src/state/optionsSlice";
import { produceState } from "../helper/produceState";
import { emptyOffset } from "../helper/offsetHelpers";
import type { TooltipPayload } from "../../src/state/tooltipSlice";

const defaultProps: CursorProps = {
  cursor: true,
  tooltipEventType: "axis",
  coordinate: undefined,
  payload: [],
  index: "0",
};

const baseCoord = { x: 0, y: 0 };

const connectedProps: CursorConnectedProps = {
  chartName: "",
  layout: "vertical",
  offset: emptyOffset,
  tooltipAxisBandSize: 0,
  ...defaultProps,
};

const preloadedState: Partial<RechartsRootState> = {
  options: {
    chartName: "",
    tooltipPayloadSearcher: arrayTooltipSearcher,
    eventEmitter: undefined,
    defaultTooltipEventType: "axis",
  },
};

const preloadedRadialState: Partial<RechartsRootState> = produceState((draft) => {
  draft.layout.layoutType = "radial";
  draft.layout.margin = { top: 11, right: 22, bottom: 33, left: 4 };
  draft.tooltip.itemInteraction.hover.active = true;
});

describe("Cursor", () => {
  describe("Internal component", () => {
    it("should render rectangle cursor for bar chart", () => {
      const props: CursorConnectedProps = {
        ...connectedProps,
        layout: "horizontal",
        tooltipAxisBandSize: 1,
        chartName: "BarChart",
        offset: emptyOffset,
        coordinate: baseCoord,
      };
      const { container } = render(() => (
        <svg width={100} height={100}>
          <CursorInternal {...props} zIndex={0} />
        </svg>
      ));
      const cursor = container.querySelector(".recharts-rectangle");
      assertNotNull(cursor);
      expect(cursor).toBeVisible();
    });

    it("should render sector cursor for radial layout charts", () => {
      const coordinate = { endAngle: 2, radius: 1, startAngle: 1, x: 0, y: 0 };
      const props: CursorConnectedProps = {
        ...connectedProps,
        chartName: "",
        offset: emptyOffset,
        tooltipAxisBandSize: 0,
        layout: "radial",
        coordinate,
      };
      const { container } = render(() => (
        <svg width={100} height={100}>
          <CursorInternal {...props} coordinate={coordinate} zIndex={0} />
        </svg>
      ));
      const cursor = container.querySelector(".recharts-sector");
      assertNotNull(cursor);
      expect(cursor).toBeVisible();
    });
  });

  describe("Connected component", () => {
    it("should render curve cursor by default", () => {
      const { container } = render(() => (
        <RechartsStoreProvider preloadedState={preloadedState}>
          <svg width={100} height={100}>
            <Cursor {...defaultProps} coordinate={baseCoord} zIndex={0} />
          </svg>
        </RechartsStoreProvider>
      ));
      const cursor = container.querySelector(".recharts-curve");
      assertNotNull(cursor);
      expect(cursor).toBeVisible();
    });

    it("should render cross cursor for scatter chart", () => {
      const preloadedScatterState: Partial<RechartsRootState> = produceState((draft) => {
        draft.options.chartName = "ScatterChart";
        draft.options.tooltipPayloadSearcher = arrayTooltipSearcher;
        draft.tooltip.itemInteraction.hover.active = true;
      });
      const { container } = render(() => (
        <RechartsStoreProvider preloadedState={preloadedScatterState}>
          <svg width={100} height={100}>
            <Cursor {...defaultProps} coordinate={baseCoord} zIndex={0} />
          </svg>
        </RechartsStoreProvider>
      ));
      const cursor = container.querySelector(".recharts-cross");
      assertNotNull(cursor);
      expect(cursor).toBeVisible();
    });

    it("should render sector cursor for radial layout charts", () => {
      const coordinate = { endAngle: 2, radius: 1, startAngle: 1, x: 0, y: 0 };
      const payload: TooltipPayload = [{ value: "test", name: "test", graphicalItemId: "foo" }];
      const { container } = render(() => (
        <RechartsStoreProvider preloadedState={preloadedRadialState}>
          <svg width={100} height={100}>
            <Cursor {...defaultProps} coordinate={coordinate} payload={payload} zIndex={0} />
          </svg>
        </RechartsStoreProvider>
      ));
      const cursor = container.querySelector(".recharts-sector");
      assertNotNull(cursor);
      expect(cursor).toBeVisible();
    });
  });

  describe("zIndex", () => {
    it("should portal the line cursor at DefaultZIndexes.cursorLine by default in a chart", () => {
      const { container } = render(() => (
        <LineChart width={400} height={400} data={PageData}>
          <Line dataKey="uv" isAnimationActive={false} />
          <Tooltip />
        </LineChart>
      ));
      showTooltip(container, lineChartMouseHoverTooltipSelector);

      const portal = container.querySelector(
        `.recharts-zIndex-layer_${DefaultZIndexes.cursorLine}`,
      );
      assertNotNull(portal);
      expect(portal.querySelector(".recharts-tooltip-cursor")).not.toBeNull();
    });

    it("should portal the cursor into the requested z-index portal when zIndex is set", () => {
      const { container } = render(() => (
        <LineChart width={400} height={400} data={PageData}>
          <Line dataKey="uv" isAnimationActive={false} />
          <Cursor {...defaultProps} coordinate={{ x: 100, y: 100 }} zIndex={1234} />
        </LineChart>
      ));
      flush();

      const portal = container.querySelector(".recharts-zIndex-layer_1234");
      assertNotNull(portal);
      expect(portal.querySelector(".recharts-tooltip-cursor")).not.toBeNull();
    });
  });
});
