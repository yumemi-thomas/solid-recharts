// Ported from recharts 3.8.1 test/component/Label.spec.tsx (commit 7a23854).
// React-element/cloneElement cases are intentionally left to Label.render.spec.tsx
// deferrals because Solid has no cloneElement equivalent.
import { flush } from "solid-js";
import { describe, expect, it, vi } from "vitest";
import { Label, Line, LineChart, ReferenceLine, Surface } from "../../src";
import type { Props as LabelProps } from "../../src/component/Label";
import { DefaultZIndexes } from "../../src/zIndex/DefaultZIndexes";
import { assertNotNull } from "../helper/assertNotNull";
import { render, screen } from "../helper/render";

const data = [
  { name: "Page A", uv: 400, pv: 2400, amt: 2400 },
  { name: "Page B", uv: 300, pv: 4567, amt: 2400 },
  { name: "Page C", uv: 300, pv: 1398, amt: 2400 },
  { name: "Page D", uv: 200, pv: 9800, amt: 2400 },
  { name: "Page E", uv: 278, pv: 3908, amt: 2400 },
  { name: "Page F", uv: 189, pv: 4800, amt: 2400 },
];

describe("<Label />", () => {
  const polarViewBox = {
    cx: 50,
    cy: 50,
    innerRadius: 20,
    outerRadius: 80,
    startAngle: 0,
    endAngle: 90,
    clockWise: false,
  };

  const cartesianViewBox = {
    x: 50,
    y: 50,
    width: 200,
    height: 200,
  };

  it('Render polar labels (position="center")', () => {
    const { container } = render(() => (
      <Surface height={0} width={0}>
        <Label viewBox={polarViewBox} value="text" position="center" />
      </Surface>
    ));
    flush();

    const label = container.querySelectorAll(".recharts-label");

    expect(label.length).toEqual(1);
    expect(label[0]).toHaveAttribute("x", `${polarViewBox.cx}`);
    expect(label[0]).toHaveAttribute("y", `${polarViewBox.cy}`);
  });

  it('Render polar labels (position="outside")', () => {
    const { container } = render(() => (
      <Surface height={0} width={0}>
        <Label viewBox={polarViewBox} value="text" position="outside" />
      </Surface>
    ));
    flush();

    const label = container.querySelectorAll(".recharts-label");

    expect(label.length).toEqual(1);
    expect(label[0]).toHaveAttribute("x", "110.10407640085654");
    expect(label[0]).toHaveAttribute("y", "-10.104076400856535");
  });

  it('Render radial labels (position="insideStart")', () => {
    const { container } = render(() => (
      <Surface height={0} width={0}>
        <Label viewBox={polarViewBox} value="text" position="insideStart" />
      </Surface>
    ));
    flush();

    const label = container.querySelectorAll(".recharts-radial-bar-label");

    expect(label.length).toEqual(1);
  });

  it('Render radial labels (position="insideEnd")', () => {
    const { container } = render(() => (
      <Surface height={0} width={0}>
        <Label viewBox={polarViewBox} value="text" position="insideEnd" />
      </Surface>
    ));
    flush();

    expect(container.querySelectorAll(".recharts-radial-bar-label").length).toEqual(1);
  });

  it('Render radial labels (position="end")', () => {
    const { container } = render(() => (
      <Surface height={0} width={0}>
        <Label viewBox={polarViewBox} value="text" position="end" />
      </Surface>
    ));
    flush();

    expect(container.querySelectorAll(".recharts-radial-bar-label").length).toEqual(1);
  });

  it('Render cartesian labels (position="center")', () => {
    const { container } = render(() => (
      <Surface height={0} width={0}>
        <Label viewBox={cartesianViewBox} value="text" position="center" />
      </Surface>
    ));
    flush();

    const label = container.querySelectorAll(".recharts-label");

    expect(label.length).toEqual(1);
    expect(label[0]).toHaveAttribute("x", `${cartesianViewBox.x + cartesianViewBox.width / 2}`);
    expect(label[0]).toHaveAttribute("y", `${cartesianViewBox.y + cartesianViewBox.height / 2}`);
  });

  describe("content/value/children variants", () => {
    describe("when only one option is provided", () => {
      function renderLabelWithChildren(children: LabelProps["children"]) {
        return render(() => (
          <Surface height={0} width={0}>
            <Label viewBox={cartesianViewBox} position="center">
              {children}
            </Label>
          </Surface>
        ));
      }

      function renderLabelWithValue(value: LabelProps["value"]) {
        return render(() => (
          <Surface height={0} width={0}>
            <Label viewBox={cartesianViewBox} position="center" value={value} />
          </Surface>
        ));
      }

      function renderLabelWithContent(content: LabelProps["content"]) {
        return render(() => (
          <Surface height={0} width={0}>
            <Label viewBox={cartesianViewBox} position="center" content={content} />
          </Surface>
        ));
      }

      describe("string", () => {
        it("should render label when given children prop", () => {
          renderLabelWithChildren("label from children");
          flush();

          const label = screen.getAllByText("label from children");
          expect(label.length).toEqual(1);
        });

        it("should render label when given value prop", () => {
          renderLabelWithValue("label from value");
          flush();

          const label = screen.getAllByText("label from value");
          expect(label.length).toEqual(1);
        });

        it("should not render label at all when given content prop", () => {
          // @ts-expect-error Recharts verifies invalid content primitives render nothing.
          const { container } = renderLabelWithContent("label from content");
          flush();

          const label = container.querySelector(".recharts-label");
          expect(label).toBeNull();
          expect(container.textContent).toBe("");
        });
      });

      describe("number", () => {
        it("should render label when given children prop", () => {
          renderLabelWithChildren(12345);
          flush();

          const label = screen.getAllByText("12345");
          expect(label.length).toEqual(1);
        });

        it("should render label when given value prop", () => {
          renderLabelWithValue(67890);
          flush();

          const label = screen.getAllByText("67890");
          expect(label.length).toEqual(1);
        });

        it("should not render label at all when given content prop", () => {
          // @ts-expect-error Recharts verifies invalid content primitives render nothing.
          const { container } = renderLabelWithContent(54321);
          flush();

          const label = container.querySelector(".recharts-label");
          expect(label).toBeNull();
          expect(container.textContent).toBe("");
        });
      });

      describe("boolean", () => {
        it("should render label when given children prop", () => {
          renderLabelWithChildren(true);
          flush();

          const label = screen.getAllByText("true");
          expect(label.length).toEqual(1);
        });

        it("should render label when given value prop", () => {
          renderLabelWithValue(false);
          flush();

          const label = screen.getAllByText("false");
          expect(label.length).toEqual(1);
        });

        it("should not render label at all when given content prop", () => {
          // @ts-expect-error Recharts verifies invalid content primitives render nothing.
          const { container } = renderLabelWithContent(true);
          flush();

          const label = container.querySelector(".recharts-label");
          expect(label).toBeNull();
          expect(container.textContent).toBe("");
        });
      });

      describe("null", () => {
        it("should not render label at all when given children prop", () => {
          const { container } = renderLabelWithChildren(null);
          flush();

          const label = container.querySelector(".recharts-label");
          expect(label).toBeNull();
        });

        it("should not render label at all when given value prop", () => {
          const { container } = renderLabelWithValue(null);
          flush();

          const label = container.querySelector(".recharts-label");
          expect(label).toBeNull();
        });

        it("should not render label at all when given content prop", () => {
          const { container } = renderLabelWithContent(undefined);
          flush();

          const label = container.querySelector(".recharts-label");
          expect(label).toBeNull();
          expect(container.textContent).toBe("");
        });
      });

      describe("undefined", () => {
        it("should not render label at all when given children prop", () => {
          const { container } = renderLabelWithChildren(undefined);
          flush();

          const label = container.querySelector(".recharts-label");
          expect(label).toBeNull();
        });

        it("should not render label at all when given value prop", () => {
          const { container } = renderLabelWithValue(undefined);
          flush();

          const label = container.querySelector(".recharts-label");
          expect(label).toBeNull();
        });

        it("should not render label at all when given content prop", () => {
          const { container } = renderLabelWithContent(undefined);
          flush();

          const label = container.querySelector(".recharts-label");
          expect(label).toBeNull();
          expect(container.textContent).toBe("");
        });
      });

      describe("function that returns a string", () => {
        it("should render label when given content prop", () => {
          const fn = vi.fn(() => "label from function");
          renderLabelWithContent(fn);
          flush();

          const label = screen.getAllByText("label from function");
          expect(label.length).toEqual(1);

          expect(fn).toHaveBeenCalledTimes(1);
          expect(fn).toHaveBeenLastCalledWith({
            angle: 0,
            offset: 5,
            position: "center",
            textBreakAll: false,
            zIndex: DefaultZIndexes.label,
            viewBox: {
              height: 200,
              width: 200,
              lowerWidth: 200,
              upperWidth: 200,
              x: 50,
              y: 50,
            },
          });
        });
      });
    });

    describe("when both children + value are provided", () => {
      it("should prefer children over value", () => {
        const { container } = render(() => (
          <Surface height={0} width={0}>
            <Label viewBox={cartesianViewBox} position="center" value="label from value">
              label from children
            </Label>
          </Surface>
        ));
        flush();

        const label = container.querySelectorAll(".recharts-label");

        expect(label.length).toEqual(1);
        assertNotNull(label[0]);
        expect(label[0].textContent).toEqual("label from children");
      });
    });

    describe("when both children + content are provided", () => {
      it("should should pass children as a prop to the content function, and render what content returned", () => {
        const contentFn = vi.fn(() => "label from content");

        const { container } = render(() => (
          <Surface height={0} width={0}>
            <Label viewBox={cartesianViewBox} position="center" content={contentFn}>
              label from children
            </Label>
          </Surface>
        ));
        flush();

        expect(container.textContent).toEqual("label from content");

        expect(contentFn).toHaveBeenCalledTimes(1);
        expect(contentFn).toHaveBeenLastCalledWith({
          angle: 0,
          children: "label from children",
          offset: 5,
          textBreakAll: false,
          position: "center",
          zIndex: DefaultZIndexes.label,
          viewBox: {
            height: 200,
            width: 200,
            lowerWidth: 200,
            upperWidth: 200,
            x: 50,
            y: 50,
          },
        });
      });
    });

    describe("when both value + content are provided", () => {
      it("should should pass value as a prop to the content function, and render what content returned", () => {
        const contentFn = vi.fn(() => "label from content");

        const { container } = render(() => (
          <Surface height={0} width={0}>
            <Label
              viewBox={cartesianViewBox}
              position="center"
              value="label from value"
              content={contentFn}
            />
          </Surface>
        ));
        flush();

        expect(container.textContent).toEqual("label from content");

        expect(contentFn).toHaveBeenCalledTimes(1);
        expect(contentFn).toHaveBeenLastCalledWith({
          angle: 0,
          value: "label from value",
          offset: 5,
          textBreakAll: false,
          position: "center",
          zIndex: DefaultZIndexes.label,
          viewBox: {
            height: 200,
            width: 200,
            lowerWidth: 200,
            upperWidth: 200,
            x: 50,
            y: 50,
          },
        });
      });
    });

    describe("when all three children + value + content are provided", () => {
      it("should should pass children and value as props to the content function, and render what content returned", () => {
        const contentFn = vi.fn(() => "label from content");

        const { container } = render(() => (
          <Surface height={0} width={0}>
            <Label
              viewBox={cartesianViewBox}
              position="center"
              value="label from value"
              content={contentFn}
            >
              label from children
            </Label>
          </Surface>
        ));
        flush();

        expect(container.textContent).toEqual("label from content");

        expect(contentFn).toHaveBeenCalledTimes(1);
        expect(contentFn).toHaveBeenLastCalledWith({
          angle: 0,
          children: "label from children",
          value: "label from value",
          textBreakAll: false,
          offset: 5,
          position: "center",
          zIndex: DefaultZIndexes.label,
          viewBox: {
            height: 200,
            width: 200,
            lowerWidth: 200,
            upperWidth: 200,
            x: 50,
            y: 50,
          },
        });
      });
    });
  });

  it("Render label by label = <Label />", () => {
    const { container } = render(() => (
      <LineChart
        width={400}
        height={400}
        data={data}
        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
      >
        <Line type="monotone" dataKey="uv" stroke="#ff7300" />
        {/* @ts-expect-error React element label form is kept as a vendor parity fixture. */}
        <ReferenceLine y={200} stroke="red" label={<Label value="Max PV PAGE" />} />
      </LineChart>
    ));
    flush();

    expect(container.querySelectorAll(".recharts-line .recharts-line-curve").length).toEqual(1);
  });

  it.skip("Renders label by label props with animation disabled", () => {
    const { container } = render(() => (
      <LineChart
        width={400}
        height={400}
        data={data}
        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
      >
        <Line
          type="monotone"
          dataKey="uv"
          stroke="#ff7300"
          // @ts-expect-error Line label object support is still deferred in this Solid port.
          label={{ position: "center" }}
          isAnimationActive={false}
        />
      </LineChart>
    ));
    flush();

    expect(container.querySelectorAll(".recharts-line .recharts-line-curve").length).toEqual(1);
    expect(screen.getByText(/400/i)).toBeInTheDocument();
  });

  it.skip("Renders label by label props with animation enabled", () => {
    const { container } = render(() => (
      <LineChart
        width={400}
        height={400}
        data={data}
        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
      >
        {/* @ts-expect-error Line label object support is still deferred in this Solid port. */}
        <Line type="monotone" dataKey="uv" stroke="#ff7300" label={{ position: "center" }} />
      </LineChart>
    ));
    flush();

    expect(container.querySelectorAll(".recharts-line .recharts-line-curve").length).toEqual(1);
    expect(screen.getByText(/400/i)).toBeInTheDocument();
  });
});
