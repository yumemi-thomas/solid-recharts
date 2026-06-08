// Ported from recharts 3.8.1 test/cartesian/GraphicalItemClipPath.spec.tsx (commit 7a23854).
// Solid deviations: wrappers use `(props) => … {props.children}`; useNeedsClip returns
// Accessors — hook probes return a settling accessor of unwrapped booleans for
// createSelectorTestCase; assertions byte-identical to reference.
import { beforeEach, describe, expect, it } from "vitest";
import { Line, LineChart, XAxis, YAxis } from "../../src";
import { createSelectorTestCase } from "../helper/createSelectorTestCase";
import { mockGetBoundingClientRect } from "../helper/mockGetBoundingClientRect";
import { expectLastCalledWith } from "../helper/expectLastCalledWith";
import { useNeedsClip } from "../../src/cartesian/GraphicalItemClipPath";
import { selectXAxisSettings, selectYAxisSettings } from "../../src/state/selectors/axisSelectors";

const data = [
  { name: "A", value: 10 },
  { name: "B", value: 20 },
  { name: "C", value: 30 },
  { name: "D", value: 40 },
  { name: "E", value: 50 },
];

const numericData = [
  { x: 1, y: 10 },
  { x: 2, y: 20 },
  { x: 3, y: 30 },
  { x: 4, y: 40 },
  { x: 5, y: 50 },
];

describe("GraphicalItemClipPath", () => {
  beforeEach(() => {
    mockGetBoundingClientRect({ width: 500, height: 300 });
  });

  describe("useNeedsClip", () => {
    describe("with no XAxis or YAxis", () => {
      const renderTestCase = createSelectorTestCase((props) => (
        <LineChart width={500} height={300} data={data}>
          <Line isAnimationActive={false} dataKey="value" />
          {props.children}
        </LineChart>
      ));

      it("should return needClip=false when there are no axes", () => {
        const { spy } = renderTestCase(function useNeedsClipDefault() {
          const clip = useNeedsClip(0, 0);
          return () => ({
            needClip: clip.needClip(),
            needClipX: clip.needClipX(),
            needClipY: clip.needClipY(),
          });
        });
        expectLastCalledWith(spy, { needClip: false, needClipX: false, needClipY: false });
      });
    });

    describe("with default categorical XAxis (no allowDataOverflow)", () => {
      const renderTestCase = createSelectorTestCase((props) => (
        <LineChart width={500} height={300} data={data}>
          <XAxis dataKey="name" />
          <YAxis />
          <Line isAnimationActive={false} dataKey="value" />
          {props.children}
        </LineChart>
      ));

      it("should return needClip=false because allowDataOverflow defaults to false", () => {
        const { spy } = renderTestCase(function useNeedsClipCategorical() {
          const clip = useNeedsClip(0, 0);
          return () => ({
            needClip: clip.needClip(),
            needClipX: clip.needClipX(),
            needClipY: clip.needClipY(),
          });
        });
        expectLastCalledWith(spy, { needClip: false, needClipX: false, needClipY: false });
      });

      it("should have allowDataOverflow=false in XAxis settings", () => {
        const { spy } = renderTestCase((state) => selectXAxisSettings(state, 0));
        expect(spy).toHaveBeenCalled();
        const settings = spy.mock.lastCall?.[0];
        expect(settings?.allowDataOverflow).toBe(false);
      });

      it("should not render a GraphicalItemClipPath element (only the global chart-level clipPath)", () => {
        const { container } = renderTestCase();
        const clipPaths = container.querySelectorAll("clipPath");
        expect(clipPaths).toHaveLength(1);
        expect(clipPaths[0]!.id).toMatch(/-clip$/);
      });
    });

    describe('with numerical XAxis type="number" and domain={["dataMin", "dataMax"]} (no allowDataOverflow)', () => {
      const renderTestCase = createSelectorTestCase((props) => (
        <LineChart width={500} height={300} data={numericData}>
          <XAxis dataKey="x" type="number" domain={["dataMin", "dataMax"]} />
          <YAxis />
          <Line isAnimationActive={false} dataKey="y" />
          {props.children}
        </LineChart>
      ));

      it('should return needClip=false because allowDataOverflow defaults to false even with type="number"', () => {
        const { spy } = renderTestCase(function useNeedsClipNumerical() {
          const clip = useNeedsClip(0, 0);
          return () => ({
            needClip: clip.needClip(),
            needClipX: clip.needClipX(),
            needClipY: clip.needClipY(),
          });
        });
        expectLastCalledWith(spy, { needClip: false, needClipX: false, needClipY: false });
      });

      it('should have allowDataOverflow=false in XAxis settings even with type="number"', () => {
        const { spy } = renderTestCase((state) => selectXAxisSettings(state, 0));
        expect(spy).toHaveBeenCalled();
        const settings = spy.mock.lastCall?.[0];
        expect(settings?.allowDataOverflow).toBe(false);
      });

      it("should not render a GraphicalItemClipPath element", () => {
        const { container } = renderTestCase();
        const clipPaths = container.querySelectorAll("clipPath");
        expect(clipPaths).toHaveLength(1);
        expect(clipPaths[0]!.id).toMatch(/-clip$/);
      });
    });

    describe("with XAxis allowDataOverflow={true}", () => {
      const renderTestCase = createSelectorTestCase((props) => (
        <LineChart width={500} height={300} data={data}>
          <XAxis dataKey="name" allowDataOverflow />
          <YAxis />
          <Line isAnimationActive={false} dataKey="value" />
          {props.children}
        </LineChart>
      ));

      it("should return needClip=true when XAxis has allowDataOverflow", () => {
        const { spy } = renderTestCase(function useNeedsClipWithOverflow() {
          const clip = useNeedsClip(0, 0);
          return () => ({
            needClip: clip.needClip(),
            needClipX: clip.needClipX(),
            needClipY: clip.needClipY(),
          });
        });
        expectLastCalledWith(spy, { needClip: true, needClipX: true, needClipY: false });
      });

      it("should have allowDataOverflow=true in XAxis settings", () => {
        const { spy } = renderTestCase((state) => selectXAxisSettings(state, 0));
        expect(spy).toHaveBeenCalled();
        const settings = spy.mock.lastCall?.[0];
        expect(settings?.allowDataOverflow).toBe(true);
      });

      it("should render a GraphicalItemClipPath element in addition to the global one", () => {
        const { container } = renderTestCase();
        const clipPaths = container.querySelectorAll("clipPath");
        expect(clipPaths.length).toBeGreaterThanOrEqual(2);
        const itemClipPaths = Array.from(clipPaths).filter((cp) => cp.id.startsWith("clipPath-"));
        expect(itemClipPaths.length).toBeGreaterThan(0);
      });
    });

    describe("with YAxis allowDataOverflow={true}", () => {
      const renderTestCase = createSelectorTestCase((props) => (
        <LineChart width={500} height={300} data={data}>
          <XAxis dataKey="name" />
          <YAxis allowDataOverflow />
          <Line isAnimationActive={false} dataKey="value" />
          {props.children}
        </LineChart>
      ));

      it("should return needClip=true when YAxis has allowDataOverflow", () => {
        const { spy } = renderTestCase(function useNeedsClipYOverflow() {
          const clip = useNeedsClip(0, 0);
          return () => ({
            needClip: clip.needClip(),
            needClipX: clip.needClipX(),
            needClipY: clip.needClipY(),
          });
        });
        expectLastCalledWith(spy, { needClip: true, needClipX: false, needClipY: true });
      });
    });

    describe("with both axes having allowDataOverflow={true}", () => {
      const renderTestCase = createSelectorTestCase((props) => (
        <LineChart width={500} height={300} data={data}>
          <XAxis dataKey="name" allowDataOverflow />
          <YAxis allowDataOverflow />
          <Line isAnimationActive={false} dataKey="value" />
          {props.children}
        </LineChart>
      ));

      it("should return needClip=true with both axes clipping", () => {
        const { spy } = renderTestCase(function useNeedsClipBothOverflow() {
          const clip = useNeedsClip(0, 0);
          return () => ({
            needClip: clip.needClip(),
            needClipX: clip.needClipX(),
            needClipY: clip.needClipY(),
          });
        });
        expectLastCalledWith(spy, { needClip: true, needClipX: true, needClipY: true });
      });
    });

    describe('with numerical XAxis type="number", domain, AND allowDataOverflow', () => {
      const renderTestCase = createSelectorTestCase((props) => (
        <LineChart width={500} height={300} data={numericData}>
          <XAxis dataKey="x" type="number" domain={["dataMin", "dataMax"]} allowDataOverflow />
          <YAxis />
          <Line isAnimationActive={false} dataKey="y" />
          {props.children}
        </LineChart>
      ));

      it("should return needClip=true when allowDataOverflow is explicitly set", () => {
        const { spy } = renderTestCase(function useNeedsClipNumericalOverflow() {
          const clip = useNeedsClip(0, 0);
          return () => ({
            needClip: clip.needClip(),
            needClipX: clip.needClipX(),
            needClipY: clip.needClipY(),
          });
        });
        expectLastCalledWith(spy, { needClip: true, needClipX: true, needClipY: false });
      });

      it("should render a GraphicalItemClipPath element", () => {
        const { container } = renderTestCase();
        const clipPaths = container.querySelectorAll("clipPath");
        expect(clipPaths.length).toBeGreaterThanOrEqual(2);
        const itemClipPaths = Array.from(clipPaths).filter((cp) => cp.id.startsWith("clipPath-"));
        expect(itemClipPaths.length).toBeGreaterThan(0);
      });
    });
  });

  describe("clipPath in the DOM", () => {
    describe("Line with categorical XAxis, no allowDataOverflow", () => {
      const renderTestCase = createSelectorTestCase((props) => (
        <LineChart width={500} height={300} data={data}>
          <XAxis dataKey="name" />
          <YAxis />
          <Line isAnimationActive={false} dataKey="value" />
          {props.children}
        </LineChart>
      ));

      it("should not apply clip-path attribute to the line curve", () => {
        const { container } = renderTestCase();
        const curve = container.querySelector(".recharts-line-curve");
        expect(curve).not.toBeNull();
        expect(curve?.getAttribute("clip-path")).toBeNull();
      });
    });

    describe("Line with categorical XAxis, with allowDataOverflow", () => {
      const renderTestCase = createSelectorTestCase((props) => (
        <LineChart width={500} height={300} data={data}>
          <XAxis dataKey="name" allowDataOverflow />
          <YAxis />
          <Line isAnimationActive={false} dataKey="value" id="test-line" />
          {props.children}
        </LineChart>
      ));

      it("should apply clip-path attribute to the line curve", () => {
        const { container } = renderTestCase();
        const curve = container.querySelector(".recharts-line-curve");
        expect(curve).not.toBeNull();
        const clipPathAttr = curve?.getAttribute("clip-path");
        expect(clipPathAttr).not.toBeNull();
        expect(clipPathAttr!).toContain("url(#clipPath-");
      });

      it("should render a GraphicalItemClipPath SVG element", () => {
        const { container } = renderTestCase();
        const clipPaths = container.querySelectorAll("clipPath");
        expect(clipPaths.length).toBeGreaterThanOrEqual(2);
        const itemClipPaths = Array.from(clipPaths).filter((cp) => cp.id.startsWith("clipPath-"));
        expect(itemClipPaths.length).toBeGreaterThan(0);
      });
    });

    describe('Line with numerical XAxis type="number", no allowDataOverflow', () => {
      const renderTestCase = createSelectorTestCase((props) => (
        <LineChart width={500} height={300} data={numericData}>
          <XAxis dataKey="x" type="number" domain={["dataMin", "dataMax"]} />
          <YAxis />
          <Line isAnimationActive={false} dataKey="y" />
          {props.children}
        </LineChart>
      ));

      it('should NOT apply clip-path attribute even with type="number" and domain', () => {
        const { container } = renderTestCase();
        const curve = container.querySelector(".recharts-line-curve");
        expect(curve).not.toBeNull();
        expect(curve?.getAttribute("clip-path")).toBeNull();
      });

      it("should NOT render a GraphicalItemClipPath element (only the global chart-level clipPath)", () => {
        const { container } = renderTestCase();
        const clipPaths = container.querySelectorAll("clipPath");
        expect(clipPaths).toHaveLength(1);
        expect(clipPaths[0]!.id).toMatch(/-clip$/);
      });
    });
  });

  describe('Root cause investigation: type="number" does not enable clipping', () => {
    it("categorical XAxis settings should have allowDataOverflow=false by default", () => {
      const renderTestCase = createSelectorTestCase((props) => (
        <LineChart width={500} height={300} data={data}>
          <XAxis dataKey="name" />
          <Line isAnimationActive={false} dataKey="value" />
          {props.children}
        </LineChart>
      ));
      const { spy } = renderTestCase((state) => selectXAxisSettings(state, 0));
      const settings = spy.mock.lastCall?.[0];
      expect(settings?.type).toBe("category");
      expect(settings?.allowDataOverflow).toBe(false);
    });

    it('numerical XAxis type="number" settings should also have allowDataOverflow=false by default', () => {
      const renderTestCase = createSelectorTestCase((props) => (
        <LineChart width={500} height={300} data={numericData}>
          <XAxis dataKey="x" type="number" domain={["dataMin", "dataMax"]} />
          <Line isAnimationActive={false} dataKey="y" />
          {props.children}
        </LineChart>
      ));
      const { spy } = renderTestCase((state) => selectXAxisSettings(state, 0));
      const settings = spy.mock.lastCall?.[0];
      expect(settings?.type).toBe("number");
      expect(settings?.allowDataOverflow).toBe(false);
    });

    it("useNeedsClip is purely driven by allowDataOverflow prop, not by axis type or domain", () => {
      const renderCategorical = createSelectorTestCase((props) => (
        <LineChart width={500} height={300} data={data}>
          <XAxis dataKey="name" />
          <Line isAnimationActive={false} dataKey="value" />
          {props.children}
        </LineChart>
      ));
      const { spy: catSpy } = renderCategorical(function useNeedsClipCat() {
        const clip = useNeedsClip(0, 0);
        return () => ({
          needClip: clip.needClip(),
          needClipX: clip.needClipX(),
          needClipY: clip.needClipY(),
        });
      });
      expect(catSpy.mock.lastCall?.[0]).toEqual({
        needClip: false,
        needClipX: false,
        needClipY: false,
      });

      const renderNumerical = createSelectorTestCase((props) => (
        <LineChart width={500} height={300} data={numericData}>
          <XAxis dataKey="x" type="number" domain={["dataMin", "dataMax"]} />
          <Line isAnimationActive={false} dataKey="y" />
          {props.children}
        </LineChart>
      ));
      const { spy: numSpy } = renderNumerical(function useNeedsClipNum() {
        const clip = useNeedsClip(0, 0);
        return () => ({
          needClip: clip.needClip(),
          needClipX: clip.needClipX(),
          needClipY: clip.needClipY(),
        });
      });
      expect(numSpy.mock.lastCall?.[0]).toEqual({
        needClip: false,
        needClipX: false,
        needClipY: false,
      });

      const renderWithOverflow = createSelectorTestCase((props) => (
        <LineChart width={500} height={300} data={numericData}>
          <XAxis dataKey="x" type="number" domain={["dataMin", "dataMax"]} allowDataOverflow />
          <Line isAnimationActive={false} dataKey="y" />
          {props.children}
        </LineChart>
      ));
      const { spy: overflowSpy } = renderWithOverflow(function useNeedsClipOverflow() {
        const clip = useNeedsClip(0, 0);
        return () => ({
          needClip: clip.needClip(),
          needClipX: clip.needClipX(),
          needClipY: clip.needClipY(),
        });
      });
      expect(overflowSpy.mock.lastCall?.[0]).toEqual({
        needClip: true,
        needClipX: true,
        needClipY: false,
      });
    });

    it("YAxis settings also have allowDataOverflow=false by default", () => {
      const renderTestCase = createSelectorTestCase((props) => (
        <LineChart width={500} height={300} data={data}>
          <XAxis dataKey="name" />
          <YAxis />
          <Line isAnimationActive={false} dataKey="value" />
          {props.children}
        </LineChart>
      ));
      const { spy } = renderTestCase((state) => selectYAxisSettings(state, 0));
      const settings = spy.mock.lastCall?.[0];
      expect(settings?.allowDataOverflow).toBe(false);
    });
  });
});
