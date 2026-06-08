// Ported from recharts 3.8.1 test/component/Cursor.spec.tsx (commit 7a23854).
//
// Only the connected-component "curve cursor by default" case is impl-ready in
// the Solid port. The other reference cases are blocked by features the minimal
// Solid Cursor deliberately defers (see src/component/Cursor.tsx header):
//   - the `CursorInternal` / `CursorConnectedProps` exports do not exist (the
//     "Internal component" describe block);
//   - custom-element cursors (`cursor` is `boolean | Record<string, unknown>`,
//     no JSX element) — "should render a custom cursor";
//   - the ScatterChart Cross (`.recharts-cross`) — "should render cross cursor";
//   - the radial Sector (`.recharts-sector`) — "should render sector cursor".
// Harness adaptations: React render → Solid render(() => …); the connected
// `Cursor` has no `zIndex` prop in the Solid port, so it is dropped.
import { describe, expect, it } from "vitest";
import { render } from "../helper/render";
import { Cursor, type CursorProps } from "../../src/component/Cursor";
import { assertNotNull } from "../helper/assertNotNull";
import type { RechartsRootState } from "../../src/state/store";
import { RechartsStoreProvider } from "../../src/state/RechartsStoreProvider";
import { arrayTooltipSearcher } from "../../src/state/optionsSlice";

const defaultProps: CursorProps = {
  cursor: true,
  tooltipEventType: "axis",
  coordinate: undefined,
  payload: [],
  index: "0",
};

const baseCoord = {
  x: 0,
  y: 0,
};

const preloadedState: Partial<RechartsRootState> = {
  options: {
    chartName: "",
    tooltipPayloadSearcher: arrayTooltipSearcher,
    eventEmitter: undefined,
    defaultTooltipEventType: "axis",
  },
};

describe("Cursor", () => {
  describe("Connected component", () => {
    it("should render curve cursor by default", () => {
      const { container } = render(() => (
        <RechartsStoreProvider preloadedState={preloadedState}>
          <svg width={100} height={100}>
            <Cursor {...defaultProps} coordinate={baseCoord} />
          </svg>
        </RechartsStoreProvider>
      ));
      const cursor = container.querySelector(".recharts-curve");
      assertNotNull(cursor);
      expect(cursor).toBeVisible();
    });
  });
});
