// Ported from recharts 3.8.1 test/component/Tooltip/Tooltip.animation.spec.tsx.
//
// The tooltip "animation" here is a CSS transition on the wrapper position
// (`transition: transform 400ms ease`), produced by TooltipBoundingBox's
// resolveTransitionProperty — NOT the JS/CSS render-prop animation drivers, so no
// MockProgressAnimationManager is involved. Tier-A assertions are byte-identical;
// the only harness adaptations are React→Solid render (via createSelectorTestCase),
// the no-destructure `props.children` wrapper, and selectIsTooltipActive imported
// from tooltipSelectors (there is no `selectors` barrel in the Solid port).
import { describe, it, expect, beforeEach } from "vitest";
import { createSelectorTestCase } from "../../helper/createSelectorTestCase";
import { Line, LineChart, Tooltip } from "../../../src";
import {
  expectTooltipCoordinate,
  expectTooltipNotVisible,
  getTooltip,
  hideTooltip,
  showTooltipOnCoordinate,
} from "./tooltipTestHelpers";
import { lineChartMouseHoverTooltipSelector } from "./tooltipMouseHoverSelectors";
import { selectIsTooltipActive } from "../../../src/state/selectors/tooltipSelectors";
import { mockGetBoundingClientRect } from "../../helper/mockGetBoundingClientRect";
import { expectLastCalledWith } from "../../helper/expectLastCalledWith";

describe("Tooltip animation", () => {
  beforeEach(() => {
    mockGetBoundingClientRect({
      width: 10,
      height: 10,
    });
  });

  describe("with default content", () => {
    const renderTestCase = createSelectorTestCase((props) => (
      <LineChart
        width={100}
        height={100}
        data={[
          { name: "A", value: 1 },
          { name: "B", value: 2 },
        ]}
      >
        <Line dataKey="value" />
        {props.children}
        <Tooltip />
      </LineChart>
    ));

    describe("when tooltip is displayed first time", () => {
      function prime(container: Element) {
        showTooltipOnCoordinate(container, lineChartMouseHoverTooltipSelector, {
          clientX: 20,
          clientY: 20,
        });
      }

      it("should select isActive: true", () => {
        const { container, spy } = renderTestCase((state) =>
          selectIsTooltipActive(state, "axis", "hover", undefined),
        );
        expectLastCalledWith(spy, { activeIndex: null, isActive: false });
        prime(container);
        expectLastCalledWith(spy, { activeIndex: "0", isActive: true });
      });

      it("should animate towards the final position", () => {
        const { container } = renderTestCase();
        prime(container);

        expectTooltipCoordinate(container, {
          x: 15,
          y: 30,
        });
      });

      it("should start at 0,0", () => {
        const { container } = renderTestCase();
        prime(container);

        const tooltip = getTooltip(container);
        expect(tooltip).toHaveStyle({
          top: 0,
          left: 0,
          transform: "translate(15px, 30px)",
          transition: "transform 400ms ease",
        });
      });
    });

    describe("when tooltip hides, and then shows again", () => {
      function prime(container: Element) {
        expectTooltipNotVisible(container);
        showTooltipOnCoordinate(container, lineChartMouseHoverTooltipSelector, {
          clientX: 20,
          clientY: 20,
        });
        hideTooltip(container, lineChartMouseHoverTooltipSelector);
        expectTooltipNotVisible(container);

        showTooltipOnCoordinate(container, lineChartMouseHoverTooltipSelector, {
          clientX: 80,
          clientY: 80,
        });
        return getTooltip(container);
      }

      it("should animate towards the final position", () => {
        const { container } = renderTestCase();
        const tooltip = prime(container);

        expect(tooltip).toHaveStyle({
          top: 0,
          left: 0,
          transform: "translate(75px, 60px)",
          transition: "transform 400ms ease",
        });
      });
    });
  });

  describe("with custom content", () => {
    const MyCustomContent = () => <p>My Custom Content</p>;
    const renderTestCase = createSelectorTestCase((props) => (
      <LineChart
        width={100}
        height={100}
        data={[
          { name: "A", value: 1 },
          { name: "B", value: 2 },
        ]}
      >
        <Line dataKey="value" />
        {props.children}
        <Tooltip content={MyCustomContent} />
      </LineChart>
    ));

    describe("when tooltip is displayed first time", () => {
      function prime(container: Element) {
        showTooltipOnCoordinate(container, lineChartMouseHoverTooltipSelector, {
          clientX: 20,
          clientY: 20,
        });
      }

      it("should select isActive: true", () => {
        const { container, spy } = renderTestCase((state) =>
          selectIsTooltipActive(state, "axis", "hover", undefined),
        );
        expectLastCalledWith(spy, { activeIndex: null, isActive: false });
        prime(container);
        expectLastCalledWith(spy, { activeIndex: "0", isActive: true });
      });

      it("should animate towards the final position", () => {
        const { container } = renderTestCase();
        prime(container);

        expectTooltipCoordinate(container, {
          x: 15,
          y: 30,
        });
      });

      it("should start at 0,0", () => {
        const { container } = renderTestCase();
        prime(container);

        const tooltip = getTooltip(container);
        expect(tooltip).toHaveStyle({
          top: 0,
          left: 0,
          transform: "translate(15px, 30px)",
          transition: "transform 400ms ease",
        });
      });
    });

    describe("when tooltip hides, and then shows again", () => {
      function prime(container: Element) {
        expectTooltipNotVisible(container);
        showTooltipOnCoordinate(container, lineChartMouseHoverTooltipSelector, {
          clientX: 20,
          clientY: 20,
        });
        hideTooltip(container, lineChartMouseHoverTooltipSelector);
        expectTooltipNotVisible(container);

        showTooltipOnCoordinate(container, lineChartMouseHoverTooltipSelector, {
          clientX: 80,
          clientY: 80,
        });
        return getTooltip(container);
      }

      it("should animate towards the final position", () => {
        const { container } = renderTestCase();
        const tooltip = prime(container);

        expect(tooltip).toHaveStyle({
          top: 0,
          left: 0,
          transform: "translate(75px, 60px)",
          transition: "transform 400ms ease",
        });
      });
    });
  });
});
