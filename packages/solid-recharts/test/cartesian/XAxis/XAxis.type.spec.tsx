// Ported from recharts 3.8.1 test/cartesian/XAxis/XAxis.type.spec.tsx (commit 7a23854).
import type { JSX } from "@solidjs/web";
import { describe, expect, it } from "vitest";
import { BarChart, XAxis } from "../../../src";
import { selectXAxisSettings } from "../../../src/state/selectors/axisSelectors";
import type { AxisDomainTypeInput } from "../../../src/util/types";
import { createSelectorTestCase } from "../../helper/createSelectorTestCase";
import { expectLastCalledWith } from "../../helper/expectLastCalledWith";

describe("XAxis type", () => {
  describe("in vertical chart", () => {
    const TestCase = (props: { children?: JSX.Element; axisType?: AxisDomainTypeInput }) => (
      <BarChart
        layout="vertical"
        width={400}
        height={400}
        data={[
          { x: "A", y: 12 },
          { x: "B", y: 5 },
        ]}
      >
        <XAxis type={props.axisType} dataKey="x" />
        {props.children}
      </BarChart>
    );

    it('should default to "category" type', () => {
      const renderTestCase = createSelectorTestCase((props) => (
        <TestCase>{props.children}</TestCase>
      ));
      const { spy } = renderTestCase((state) => selectXAxisSettings(state, 0));
      expectLastCalledWith(spy, expect.objectContaining({ type: "category" }));
    });

    it('should set type to "number"', () => {
      const renderTestCase = createSelectorTestCase((props) => (
        <TestCase axisType="number">{props.children}</TestCase>
      ));
      const { spy } = renderTestCase((state) => selectXAxisSettings(state, 0));
      expectLastCalledWith(spy, expect.objectContaining({ type: "number" }));
    });

    it('should set type to "category"', () => {
      const renderTestCase = createSelectorTestCase((props) => (
        <TestCase axisType="category">{props.children}</TestCase>
      ));
      const { spy } = renderTestCase((state) => selectXAxisSettings(state, 0));
      expectLastCalledWith(spy, expect.objectContaining({ type: "category" }));
    });

    it('should infer type as "number"', () => {
      const renderTestCase = createSelectorTestCase((props) => (
        <TestCase axisType="auto">{props.children}</TestCase>
      ));
      const { spy } = renderTestCase((state) => selectXAxisSettings(state, 0));
      expectLastCalledWith(spy, expect.objectContaining({ type: "number" }));
    });
  });

  describe("in horizontal chart", () => {
    const TestCase = (props: { children?: JSX.Element; axisType?: AxisDomainTypeInput }) => (
      <BarChart
        width={400}
        height={400}
        data={[
          { x: 12, y: "A" },
          { x: 5, y: "B" },
        ]}
      >
        <XAxis type={props.axisType} dataKey="x" />
        {props.children}
      </BarChart>
    );

    it('should default to "category" type', () => {
      const renderTestCase = createSelectorTestCase((props) => (
        <TestCase>{props.children}</TestCase>
      ));
      const { spy } = renderTestCase((state) => selectXAxisSettings(state, 0));
      expectLastCalledWith(spy, expect.objectContaining({ type: "category" }));
    });

    it('should set type to "number"', () => {
      const renderTestCase = createSelectorTestCase((props) => (
        <TestCase axisType="number">{props.children}</TestCase>
      ));
      const { spy } = renderTestCase((state) => selectXAxisSettings(state, 0));
      expectLastCalledWith(spy, expect.objectContaining({ type: "number" }));
    });

    it('should set type to "category"', () => {
      const renderTestCase = createSelectorTestCase((props) => (
        <TestCase axisType="category">{props.children}</TestCase>
      ));
      const { spy } = renderTestCase((state) => selectXAxisSettings(state, 0));
      expectLastCalledWith(spy, expect.objectContaining({ type: "category" }));
    });

    it('should infer type as "category"', () => {
      const renderTestCase = createSelectorTestCase((props) => (
        <TestCase axisType="auto">{props.children}</TestCase>
      ));
      const { spy } = renderTestCase((state) => selectXAxisSettings(state, 0));
      expectLastCalledWith(spy, expect.objectContaining({ type: "category" }));
    });
  });
});
