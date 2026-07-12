import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from "vitest";

import { BarChart, Bar, Tooltip, XAxis } from "../../src";
import { PageData } from "../_data";
import { selectSyncId } from "../../src/state/selectors/rootPropsSelectors";
import {
  TOOLTIP_SYNC_EVENT,
  syncEventCenter,
  type TooltipSyncListener,
} from "../../src/synchronisation/syncRegistry";
import { createSelectorTestCase } from "../helper/createSelectorTestCase";
import { hideTooltip, showTooltip } from "../component/Tooltip/tooltipTestHelpers";
import { barChartMouseHoverTooltipSelector } from "../component/Tooltip/tooltipMouseHoverSelectors";
import { mockGetBoundingClientRect } from "../helper/mockGetBoundingClientRect";
import { expectLastCalledWith } from "../helper/expectLastCalledWith";

/*
 * Ported from recharts 3.8.1 test/synchronisation/useChartSynchronisation.spec.tsx.
 *
 * Solid adaptations:
 *  - recharts emits over the mitt `eventCenter`; the Solid port emits over
 *    `syncEventCenter` (src/synchronisation/syncRegistry.ts), which mirrors mitt's
 *    `on`/`off`/`emit` surface. The spy subscribes there.
 *  - recharts' payload is a Redux `setSyncInteraction(payload)` action object;
 *    in the Solid port `setSyncInteraction` is a void store mutator, so the
 *    registry carries the *plain* TooltipSyncState payload — the spy asserts that
 *    object directly (it's identical to recharts' `action.payload`).
 *  - State settles with Solid `flush()` (inside the test helpers) rather than
 *    fake timers / Redux autobatch.
 */

describe("useTooltipChartSynchronisation", () => {
  let eventSpy: Mock;
  let listener: TooltipSyncListener;

  beforeEach(() => {
    eventSpy = vi.fn();
    listener = (syncId, payload, emitter) => eventSpy(syncId, payload, emitter);
    syncEventCenter.on(TOOLTIP_SYNC_EVENT, listener);
    mockGetBoundingClientRect({ width: 100, height: 100 });
  });

  afterEach(() => {
    syncEventCenter.off(TOOLTIP_SYNC_EVENT, listener);
  });

  describe("when syncId is set and Tooltip is present", () => {
    const viewBox = {
      height: 390,
      width: 790,
      x: 5,
      y: 5,
    };

    const renderTestCase = createSelectorTestCase((props) => (
      <BarChart width={800} height={400} data={PageData} syncId="my-sync-id">
        <Bar dataKey="uv" />
        <Tooltip />
        {props.children}
      </BarChart>
    ));

    it("should select syncId from the state", () => {
      const { spy } = renderTestCase(selectSyncId);
      expectLastCalledWith(spy, "my-sync-id");
    });

    it("should send one sync event on the initial render", () => {
      renderTestCase();
      expect(eventSpy).toHaveBeenCalledTimes(1);
      expect(eventSpy).toHaveBeenLastCalledWith(
        "my-sync-id",
        {
          active: false,
          coordinate: undefined,
          dataKey: undefined,
          index: null,
          label: undefined,
          sourceViewBox: viewBox,
          graphicalItemId: undefined,
        },
        expect.any(Symbol),
      );
    });

    it("should send a sync event after mouse move, and another after mouse leave", () => {
      const { container } = renderTestCase();
      eventSpy.mockClear();
      showTooltip(container, barChartMouseHoverTooltipSelector);
      expect(eventSpy).toHaveBeenCalledTimes(1);
      expect(eventSpy).toHaveBeenLastCalledWith(
        "my-sync-id",
        {
          active: true,
          coordinate: {
            x: 202.5,
            y: 200,
          },
          dataKey: undefined,
          index: "1",
          label: "1",
          sourceViewBox: viewBox,
          graphicalItemId: undefined,
        },
        expect.any(Symbol),
      );

      hideTooltip(container, barChartMouseHoverTooltipSelector);
      expect(eventSpy).toHaveBeenCalledTimes(2);
      expect(eventSpy).toHaveBeenLastCalledWith(
        "my-sync-id",
        {
          active: false,
          coordinate: {
            x: 202.5,
            y: 200,
          },
          dataKey: undefined,
          index: null,
          label: undefined,
          sourceViewBox: viewBox,
          graphicalItemId: undefined,
        },
        expect.any(Symbol),
      );
    });
  });

  describe("with XAxis and dataKey", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <BarChart width={800} height={400} data={PageData} syncId="my-sync-id">
        <Bar dataKey="uv" />
        <XAxis dataKey="name" />
        <Tooltip />
        {props.children}
      </BarChart>
    ));

    it("should send the XAxis label as activeLabel", () => {
      const { container } = renderTestCase();
      eventSpy.mockClear();
      showTooltip(container, barChartMouseHoverTooltipSelector);
      expect(eventSpy).toHaveBeenCalledTimes(1);
      expect(eventSpy).toHaveBeenLastCalledWith(
        "my-sync-id",
        {
          active: true,
          coordinate: {
            x: 202.5,
            y: 200,
          },
          dataKey: undefined,
          index: "1",
          label: "Page B",
          sourceViewBox: {
            height: 360,
            width: 790,
            x: 5,
            y: 5,
          },
          graphicalItemId: undefined,
        },
        expect.any(Symbol),
      );
    });
  });

  describe("when syncId is set but Tooltip is not present", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <BarChart width={800} height={400} data={PageData} syncId="my-sync-id">
        <Bar dataKey="uv" />
        {props.children}
      </BarChart>
    ));

    it("should select syncId from the state", () => {
      const { spy } = renderTestCase(selectSyncId);
      expectLastCalledWith(spy, "my-sync-id");
    });

    it("should not send any sync events", () => {
      renderTestCase();
      expect(eventSpy).not.toHaveBeenCalled();
    });
  });

  describe("when syncId is not set and Tooltip is not present", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <BarChart width={800} height={400} data={PageData}>
        <Bar dataKey="uv" />
        {props.children}
      </BarChart>
    ));

    it("should select syncId from the state", () => {
      const { spy } = renderTestCase(selectSyncId);
      expectLastCalledWith(spy, undefined);
    });

    it("should not send any sync events", () => {
      renderTestCase();
      expect(eventSpy).not.toHaveBeenCalled();
    });
  });

  describe("when syncId is not set but Tooltip is present", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <BarChart width={800} height={400} data={PageData}>
        <Bar dataKey="uv" />
        <Tooltip />
        {props.children}
      </BarChart>
    ));

    it("should select syncId from the state", () => {
      const { spy } = renderTestCase(selectSyncId);
      expectLastCalledWith(spy, undefined);
    });

    it("should not send any sync events", () => {
      renderTestCase();
      expect(eventSpy).not.toHaveBeenCalled();
    });
  });
});
