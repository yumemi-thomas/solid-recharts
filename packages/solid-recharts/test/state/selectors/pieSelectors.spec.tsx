import { describe, expect, it } from "vitest";
import type { RechartsRootState } from "../../../src/state/store";
import { selectPieSectors } from "../../../src/state/selectors/pieSelectors";
import { Pie, PieChart } from "../../../src";
import {
  shouldReturnFromInitialState,
  shouldReturnUndefinedOutOfContext,
} from "../../helper/selectorTestHelpers";
import { createSelectorTestCase } from "../../helper/createSelectorTestCase";
import { assertNotNull } from "../../helper/assertNotNull";

/*
 * Ported from recharts 3.8.1 test/state/selectors/pieSelectors.spec.tsx.
 * Omitted:
 *  - the big "after interaction" golden test (depends on the storybook `pageData`
 *    dataset + a React useState button + render-count assertions — N/A here).
 *  - the "should include custom data properties in PieSectorDataItem" test. That
 *    asserts recharts spreads the raw data entry onto each sector (so `customProp`/
 *    `extraField` appear at the sector top level). This port DELIBERATELY does not
 *    spread the data entry onto the sector (see Pie.tsx header: the
 *    `@ts-expect-error`-laden unknown-data spreads are replaced with typed
 *    coercion — the data stays in `sector.payload`), and adds a Solid `class`
 *    field. So that exact-shape assertion targets an intentional deviation.
 * Ported: the pure value assertions and the issue #1698 zero-value paddingAngle
 * regression (a behavioural, not shape, assertion).
 */

describe("selectPieSectors", () => {
  const selector = (state: RechartsRootState) => selectPieSectors(state, "pie-id", []);

  shouldReturnUndefinedOutOfContext(selector);
  shouldReturnFromInitialState(selector, undefined);
});

describe("selectPieSectors paddingAngle", () => {
  describe("when data contains zero-value items and paddingAngle is set", () => {
    // https://github.com/recharts/recharts/issues/1698
    // Zero-value sectors should not consume paddingAngle, which would create a double gap
    const renderZeroValueTestCase = createSelectorTestCase((props) => (
      <PieChart width={400} height={400}>
        <Pie
          dataKey="value"
          data={[
            { name: "A", value: 400 },
            { name: "B", value: 300 },
            { name: "C", value: 0 },
            { name: "D", value: 200 },
          ]}
          cx={200}
          cy={200}
          outerRadius={80}
          paddingAngle={5}
          id="pie-id"
        />
        {props.children}
      </PieChart>
    ));

    it("should set paddingAngle to 0 for zero-value sectors", () => {
      const { spy } = renderZeroValueTestCase((state) => selectPieSectors(state, "pie-id", []));
      const sectors = spy.mock.lastCall?.[0];
      assertNotNull(sectors);
      expect(sectors).toHaveLength(4);
      // Non-zero sectors have paddingAngle = 5
      expect(sectors[0].paddingAngle).toBe(5);
      expect(sectors[1].paddingAngle).toBe(5);
      // Zero-value sector must have paddingAngle = 0, not 5
      expect(sectors[2].paddingAngle).toBe(0);
      expect(sectors[3].paddingAngle).toBe(5);
    });
  });
});
