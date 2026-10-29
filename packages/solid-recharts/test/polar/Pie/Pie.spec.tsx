import { describe, expect, it, test, vi } from "vitest";
import { flush, Show, untrack } from "solid-js";
import { Pie, PieChart, Sector, Tooltip, Label, type PieProps } from "../../../src";
import type {
  PieSectorDataItem,
  PieLabelRenderProps,
  PieSectorShapeProps,
} from "../../../src/polar/Pie";
import { PageData } from "../../_data";
import { render, fireEvent } from "@solidjs/testing-library";
import { expectPieSectors } from "../../helper/expectPieSectors";
import { expectTooltipPayload } from "../../component/Tooltip/tooltipTestHelpers";
import { assertNotNull } from "../../helper/assertNotNull";
import {
  DATA_ITEM_GRAPHICAL_ITEM_ID_ATTRIBUTE_NAME,
  DATA_ITEM_INDEX_ATTRIBUTE_NAME,
} from "../../../src/util/Constants";

/*
 * Ported from recharts 3.8.1 test/polar/Pie/Pie.spec.tsx.
 * Ported incrementally by describe block. Wrappers/`render` use the Solid helper.
 */

const pageDataSectorPaths = [
  { d: "M 455,255 A 200,200,0, 0,0, 267.6184,55.3985 L 255,255 Z" },
  { d: "M 267.6184,55.3985 A 200,200,0, 0,0, 79.7896,158.5566 L 255,255 Z" },
  { d: "M 79.7896,158.5566 A 200,200,0, 0,0, 93.1078,372.4347 L 255,255 Z" },
  { d: "M 93.1078,372.4347 A 200,200,0, 0,0, 217.3458,451.4234 L 255,255 Z" },
  { d: "M 217.3458,451.4234 A 200,200,0, 0,0, 406.3627,385.7261 L 255,255 Z" },
  { d: "M 406.3627,385.7261 A 200,200,0, 0,0, 455,255.0003 L 255,255 Z" },
];

const sectorsData = [
  {
    cx: 250,
    cy: 250,
    innerRadius: 50,
    outerRadius: 100,
    startAngle: 0,
    endAngle: 72,
    name: "A",
    value: 40,
  },
  { cx: 250, cy: 250, innerRadius: 50, outerRadius: 100, startAngle: 72, endAngle: 144, name: "B" },
  {
    cx: 250,
    cy: 250,
    innerRadius: 50,
    outerRadius: 100,
    startAngle: 144,
    endAngle: 216,
    name: "C",
  },
  { cx: 250, cy: 250, innerRadius: 50, outerRadius: 100, startAngle: 216, endAngle: 288 },
  { cx: 250, cy: 250, innerRadius: 50, outerRadius: 100, startAngle: 288, endAngle: 360 },
];

describe("<Pie />", () => {
  describe("rendering", () => {
    test("Render sectors in a simple Pie", () => {
      const { container } = render(() => (
        <PieChart width={500} height={500}>
          <Pie
            isAnimationActive={false}
            cx={250}
            cy={250}
            innerRadius={0}
            outerRadius={200}
            data={PageData}
            dataKey="uv"
          />
        </PieChart>
      ));
      expectPieSectors(container, pageDataSectorPaths);
    });

    test("Render Pie in a custom component", () => {
      const CustomPie = (props: PieProps): ReturnType<typeof Pie> => <Pie {...props} />;
      const { container } = render(() => (
        <PieChart width={500} height={500}>
          <CustomPie
            isAnimationActive={false}
            cx={250}
            cy={250}
            innerRadius={0}
            outerRadius={200}
            data={PageData}
            dataKey="uv"
          />
        </PieChart>
      ));
      expectPieSectors(container, pageDataSectorPaths);
    });

    test("Renders nothing if hide=true", () => {
      const { container } = render(() => (
        <PieChart width={500} height={500}>
          <Pie
            hide
            isAnimationActive={false}
            cx={250}
            cy={250}
            innerRadius={0}
            outerRadius={200}
            data={PageData}
            dataKey="uv"
          />
        </PieChart>
      ));
      expectPieSectors(container, []);
    });

    test("Render customized active sector when shape is a function and isActive is used", () => {
      const { container } = render(() => (
        <PieChart width={500} height={500}>
          <Pie
            isAnimationActive={false}
            shape={(props) => (
              <Sector
                {...props}
                fill="#ff7300"
                class={props.isActive ? "customized-active-shape" : undefined}
              />
            )}
            cx={250}
            cy={250}
            innerRadius={0}
            outerRadius={200}
            data={PageData}
            dataKey="uv"
          />
          <Tooltip />
        </PieChart>
      ));
      flush();

      fireEvent.mouseEnter(container.querySelector(".recharts-pie-sector")!);
      flush();

      expect(container.querySelectorAll(".customized-active-shape")).toHaveLength(1);
    });

    test("Render customized active sector when activeShape is set to be an object", () => {
      const { container } = render(() => (
        <PieChart width={500} height={500}>
          <Pie
            isAnimationActive={false}
            activeShape={{ fill: "#ff7300", class: "customized-active-shape" }}
            cx={250}
            cy={250}
            innerRadius={0}
            outerRadius={200}
            data={PageData}
            dataKey="uv"
          />
          <Tooltip />
        </PieChart>
      ));
      flush();

      fireEvent.mouseEnter(container.querySelector(".recharts-pie-sector")!);
      flush();

      expect(container.querySelectorAll(".customized-active-shape")).toHaveLength(1);
    });

    test("Render customized inactive sectors when inactiveShape is a function", () => {
      const renderActiveShape = (props: PieSectorShapeProps): ReturnType<typeof Sector> => (
        <Sector {...props} fill="#ff7300" class="customized-active-shape" />
      );
      const renderInactiveShape = (props: PieSectorShapeProps): ReturnType<typeof Sector> => (
        <Sector {...props} fill="#ff7300" class="customized-inactive-shape" />
      );
      const { container } = render(() => (
        <PieChart width={500} height={500}>
          <Pie
            isAnimationActive={false}
            activeShape={renderActiveShape}
            inactiveShape={renderInactiveShape}
            cx={250}
            cy={250}
            innerRadius={0}
            outerRadius={200}
            data={PageData}
            dataKey="uv"
          />
        </PieChart>
      ));
      flush();
      expect(container.querySelectorAll(".customized-inactive-shape")).toHaveLength(0);

      fireEvent.mouseEnter(container.querySelector(".recharts-pie-sector")!);
      flush();

      expect(container.querySelectorAll(".customized-active-shape")).toHaveLength(1);
      expect(container.querySelectorAll(".customized-inactive-shape")).toHaveLength(
        PageData.length - 1,
      );
    });

    test("Render customized inactive sectors when inactiveShape is an object", () => {
      const { container } = render(() => (
        <PieChart width={500} height={500}>
          <Pie
            isAnimationActive={false}
            fill="red"
            activeShape={{ fill: "green" }}
            inactiveShape={{ fill: "blue" }}
            cx={250}
            cy={250}
            innerRadius={0}
            outerRadius={200}
            data={PageData}
            dataKey="uv"
          />
          <Tooltip />
        </PieChart>
      ));
      flush();
      const renderedSectors = container.querySelectorAll(".recharts-sector");
      expect(renderedSectors).toHaveLength(PageData.length);
      renderedSectors.forEach((s) => {
        expect(s.getAttribute("fill")).toBe("red");
      });

      fireEvent.mouseEnter(container.querySelector(".recharts-pie-sector")!);
      flush();

      const renderedSectors2 = container.querySelectorAll(".recharts-sector");
      expect(renderedSectors2[0]).toHaveAttribute("fill", "green");
      for (let i = 1; i < PageData.length; i += 1) {
        expect(renderedSectors2[i]).toHaveAttribute("fill", "blue");
      }
    });

    test("should not render customized inactive sectors if there is no active index", () => {
      const renderActiveShape = (props: PieSectorShapeProps): ReturnType<typeof Sector> => (
        <Sector {...props} fill="#ff7300" class="customized-active-shape" />
      );
      const renderInactiveShape = (props: PieSectorShapeProps): ReturnType<typeof Sector> => (
        <Sector {...props} fill="#ff7300" class="customized-inactive-shape" />
      );
      const { container } = render(() => (
        <PieChart width={500} height={500}>
          <Pie
            isAnimationActive={false}
            activeShape={renderActiveShape}
            inactiveShape={renderInactiveShape}
            cx={250}
            cy={250}
            innerRadius={0}
            outerRadius={200}
            data={sectorsData}
            dataKey="cy"
          />
        </PieChart>
      ));
      flush();
      expect(container.querySelectorAll(".customized-inactive-shape")).toHaveLength(0);
    });

    test("Don't render any sector when data is empty", () => {
      const { container } = render(() => (
        <PieChart width={500} height={500}>
          <Pie data={[]} dataKey="cy" />
        </PieChart>
      ));
      flush();

      expect(container.querySelectorAll(".recharts-pie")).toHaveLength(1);
      expect(container.querySelectorAll(".recharts-pie-sector")).toHaveLength(0);
    });

    test("should use per-sector fill for tooltip item color when shape is customized", () => {
      const data = [
        { name: "A", value: 100, fill: "#ff0000" },
        { name: "B", value: 100, fill: "#00ff00" },
      ];

      const readFill = (payload: unknown): string | undefined => {
        if (typeof payload === "object" && payload != null && "fill" in payload) {
          const { fill } = payload;
          return typeof fill === "string" ? fill : undefined;
        }
        return undefined;
      };
      const renderShape = (item: PieSectorDataItem): ReturnType<typeof Sector> => {
        const payloadFill = readFill(item.payload);
        return (
          <Sector
            cx={item.cx}
            cy={item.cy}
            innerRadius={item.innerRadius}
            outerRadius={item.outerRadius}
            startAngle={item.startAngle}
            endAngle={item.endAngle}
            fill={payloadFill}
          />
        );
      };

      const { container } = render(() => (
        <PieChart width={500} height={500}>
          <Pie
            isAnimationActive={false}
            cx={250}
            cy={250}
            innerRadius={0}
            outerRadius={200}
            data={data}
            dataKey="value"
            nameKey="name"
            fill="#8884d8"
            shape={renderShape}
          />
          <Tooltip defaultIndex={0} />
        </PieChart>
      ));

      expectTooltipPayload(container, "", ["A : 100"]);

      const tooltipItem = container.querySelector(".recharts-tooltip-item");
      assertNotNull(tooltipItem);
      if (!(tooltipItem instanceof HTMLElement)) {
        throw new Error(
          `Expected instance of HTMLElement, instead received: [${tooltipItem.nodeName}]`,
        );
      }
      expect(tooltipItem).toHaveStyle({ color: "rgb(255, 0, 0)" });
    });
  });

  describe("label", () => {
    test("Render customized label when label is a function", () => {
      // The assertions inspect the values the chart hands to the label renderer.
      const renderLabel = (props: PieLabelRenderProps): string =>
        untrack(() => {
          const ir: number = props.innerRadius;
          expect(ir).toBe(0);
          const or: number = props.outerRadius;
          expect(or).toBe(200);
          const p = props.percent;
          expect(p).toBeGreaterThanOrEqual(0);
          expect(p).toBeLessThanOrEqual(1);
          return `${props.name}: ${props.value}`;
        });
      const { container } = render(() => (
        <PieChart width={500} height={500}>
          <Pie
            isAnimationActive={false}
            cx={250}
            cy={250}
            label={renderLabel}
            innerRadius={0}
            outerRadius={200}
            data={sectorsData}
            dataKey="value"
          />
        </PieChart>
      ));
      flush();

      const labels = container.querySelectorAll(".recharts-pie-label-text");
      expect(labels).toHaveLength(sectorsData.length);
      expect(labels[0]!.textContent).toBe("A: 40");
    });

    test("Render customized label when label is a component returning a text element", () => {
      const RenderLabel = (props: PieLabelRenderProps): ReturnType<typeof Sector> => (
        <text x={props.x} y={props.y} class="customized-label">
          test
        </text>
      );
      const { container } = render(() => (
        <PieChart width={500} height={500}>
          <Pie
            isAnimationActive={false}
            cx={250}
            cy={250}
            label={RenderLabel}
            innerRadius={0}
            outerRadius={200}
            data={sectorsData}
            dataKey="cy"
          />
        </PieChart>
      ));
      flush();

      expect(container.querySelectorAll(".customized-label")).toHaveLength(sectorsData.length);
    });

    test("Render customized label line when labelLine is a function", () => {
      const renderLabelLine = (props: {
        points?: ReadonlyArray<{ x: number; y: number }>;
      }): ReturnType<typeof Sector> => (
        <Show when={props.points}>
          {(points) => (
            <path
              d={`M${points()[0]!.x},${points()[0]!.y}L${points()[1]!.x},${points()[1]!.y}`}
              class="customized-label-line"
            />
          )}
        </Show>
      );
      const { container } = render(() => (
        <PieChart width={500} height={500}>
          <Pie
            isAnimationActive={false}
            cx={250}
            cy={250}
            label
            labelLine={renderLabelLine}
            innerRadius={0}
            outerRadius={200}
            data={sectorsData}
            dataKey="cy"
          />
        </PieChart>
      ));
      flush();

      expect(container.querySelectorAll(".customized-label-line")).toHaveLength(sectorsData.length);
    });

    test("Render default label text + label line when label is truthy", () => {
      const { container } = render(() => (
        <PieChart width={500} height={500}>
          <Pie
            isAnimationActive={false}
            cx={250}
            cy={250}
            label
            innerRadius={0}
            outerRadius={200}
            data={sectorsData}
            dataKey="cy"
          />
        </PieChart>
      ));
      flush();

      expect(container.querySelectorAll(".recharts-pie-label-text")).toHaveLength(
        sectorsData.length,
      );
      expect(container.querySelectorAll(".recharts-pie-label-line")).toHaveLength(
        sectorsData.length,
      );
    });

    it("should render label with position=center", () => {
      // https://github.com/recharts/recharts/issues/5985
      const { container } = render(() => (
        <PieChart width={500} height={500}>
          <Pie
            isAnimationActive={false}
            innerRadius={100}
            outerRadius={200}
            data={sectorsData}
            dataKey="cy"
          >
            <Label position="center" value="My test label" />
          </Pie>
        </PieChart>
      ));
      flush();

      const label = container.querySelector(".recharts-label");
      expect(label).not.toBeNull();
      expect(label).toHaveAttribute("x", "250");
      expect(label).toHaveAttribute("y", "250");
    });

    it("should shift the label with dx and dy", () => {
      const { container } = render(() => (
        <PieChart width={500} height={500}>
          <Pie
            isAnimationActive={false}
            innerRadius={100}
            outerRadius={200}
            data={sectorsData}
            dataKey="cy"
          >
            <Label position="center" value="My test label" dx={50} dy={-20} />
          </Pie>
        </PieChart>
      ));
      flush();

      const label = container.querySelector(".recharts-label");
      expect(label).not.toBeNull();
      expect(label).toHaveAttribute("x", "300");
      expect(label).toHaveAttribute("y", "230");
    });
  });

  describe("events", () => {
    test("should call external onMouseEnter / onMouseLeave / onClick handlers", () => {
      const onMouseEnter = vi.fn();
      const onMouseLeave = vi.fn();
      const onClick = vi.fn();
      const { container } = render(() => (
        <PieChart width={400} height={400}>
          <Pie
            isAnimationActive={false}
            data={sectorsData}
            dataKey="cy"
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            onClick={onClick}
          />
        </PieChart>
      ));
      flush();

      const sector = container.querySelectorAll(".recharts-pie-sector")[1];
      assertNotNull(sector);

      fireEvent.mouseEnter(sector);
      expect(onMouseEnter).toHaveBeenCalledTimes(1);
      const enterArgs = onMouseEnter.mock.lastCall;
      assertNotNull(enterArgs);
      expect(enterArgs[0]).toMatchObject({ name: "B", value: 250, dataKey: "cy" });
      expect(enterArgs[1]).toBe(1);

      fireEvent.mouseLeave(sector);
      expect(onMouseLeave).toHaveBeenCalledTimes(1);
      expect(onMouseLeave.mock.lastCall?.[1]).toBe(1);

      fireEvent.click(sector);
      expect(onClick).toHaveBeenCalledTimes(1);
      expect(onClick.mock.lastCall?.[1]).toBe(1);
    });

    it("should fire onClick with the full sector data when clicking a sector", () => {
      const handleClick = vi.fn();
      const { container } = render(() => (
        <PieChart width={500} height={500}>
          <Pie
            isAnimationActive={false}
            cx={250}
            cy={250}
            innerRadius={0}
            outerRadius={200}
            data={PageData}
            dataKey="uv"
            onClick={handleClick}
            id="pie-uv"
          />
        </PieChart>
      ));
      flush();

      const sectors = container.querySelectorAll(".recharts-pie-sector");
      fireEvent.click(sectors[0]!);
      expect(handleClick).toHaveBeenCalledTimes(1);
      const arg = handleClick.mock.lastCall?.[0];
      expect(arg).toMatchObject({
        amt: 2400,
        cx: 255,
        cy: 255,
        dataKey: "uv",
        name: "Page A",
        outerRadius: 200,
        uv: 400,
        value: 400,
      });
      expect(handleClick.mock.lastCall?.[1]).toBe(0);
    });

    it("should fire onMouseOver and onMouseOut handlers", () => {
      const handleMouseOver = vi.fn();
      const handleMouseOut = vi.fn();
      const { container } = render(() => (
        <PieChart width={500} height={500}>
          <Pie
            isAnimationActive={false}
            cx={250}
            cy={250}
            innerRadius={0}
            outerRadius={200}
            data={PageData}
            dataKey="uv"
            onMouseOver={handleMouseOver}
            onMouseOut={handleMouseOut}
            id="pie-uv"
          />
        </PieChart>
      ));
      flush();

      const sectors = container.querySelectorAll(".recharts-pie-sector");
      fireEvent.mouseOver(sectors[0]!);
      expect(handleMouseOver).toHaveBeenCalledTimes(1);
      expect(handleMouseOver.mock.lastCall?.[0]).toMatchObject({ name: "Page A", value: 400 });

      fireEvent.mouseOut(sectors[0]!);
      expect(handleMouseOut).toHaveBeenCalledTimes(1);
      expect(handleMouseOut.mock.lastCall?.[0]).toMatchObject({ name: "Page A", value: 400 });
    });

    it("should fire onTouchMove and onTouchEnd handlers", () => {
      const handleTouchMove = vi.fn();
      const handleTouchEnd = vi.fn();
      const { container } = render(() => (
        <PieChart width={500} height={500}>
          <Pie
            isAnimationActive={false}
            cx={250}
            cy={250}
            innerRadius={0}
            outerRadius={200}
            data={PageData}
            dataKey="uv"
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            id="pie-uv"
          />
        </PieChart>
      ));
      flush();

      const sectors = container.querySelectorAll(".recharts-pie-sector");
      fireEvent.touchMove(sectors[0]!, { touches: [{ clientX: 200, clientY: 200 }] });
      expect(handleTouchMove).toHaveBeenCalledTimes(1);
      expect(handleTouchMove.mock.lastCall?.[0]).toMatchObject({ name: "Page A", value: 400 });
      expect(handleTouchMove.mock.lastCall?.[1]).toBe(0);
    });
  });

  describe("Tooltip integration", () => {
    test("should provide touch attributes on sectors", () => {
      const { container } = render(() => (
        <PieChart width={400} height={400}>
          <Pie isAnimationActive={false} data={sectorsData} dataKey="cy" id="cy-pie" />
          <Tooltip isAnimationActive={false} />
        </PieChart>
      ));

      const allSectors = container.querySelectorAll(".recharts-pie-sector .recharts-sector");
      expect(allSectors).toHaveLength(sectorsData.length);
      allSectors.forEach((sector, index) => {
        expect(sector).toHaveAttribute(DATA_ITEM_INDEX_ATTRIBUTE_NAME, `${index}`);
        expect(sector).toHaveAttribute(DATA_ITEM_GRAPHICAL_ITEM_ID_ATTRIBUTE_NAME, "cy-pie");
      });
    });
  });

  test("when data.length <= 1 set force paddingAngle to zero", () => {
    const { container } = render(() => (
      <PieChart width={500} height={500}>
        <Pie isAnimationActive={false} data={[{ uv: 1 }]} dataKey="uv" paddingAngle={360} />
      </PieChart>
    ));

    expect(container.querySelector("path")).not.toBeNull();
  });

  describe("Coordinates", () => {
    it("should allow outerRadius callback to return string", () => {
      const data = [
        { name: "A", value: 40 },
        { name: "B", value: 30 },
        { name: "C", value: 20 },
      ];

      const readName = (dataPoint: unknown): unknown =>
        typeof dataPoint === "object" && dataPoint != null && "name" in dataPoint
          ? dataPoint.name
          : undefined;
      const outerRadiusCallback = (dataPoint: unknown): string => {
        const name = readName(dataPoint);
        if (name === "A") return "60%";
        if (name === "B") return "80%";
        return "100%";
      };

      const { container } = render(() => (
        <PieChart width={500} height={500}>
          <Pie
            isAnimationActive={false}
            cx={250}
            cy={250}
            innerRadius={0}
            outerRadius={outerRadiusCallback}
            data={data}
            dataKey="value"
          />
        </PieChart>
      ));

      const sectors = container.querySelectorAll(".recharts-sector");
      expect(sectors).toHaveLength(3);

      const sectorPaths = Array.from(sectors).map((sector) => sector.getAttribute("d"));
      expect(sectorPaths[0]).not.toBe(sectorPaths[1]);
      expect(sectorPaths[1]).not.toBe(sectorPaths[2]);
      expect(sectorPaths[0]).not.toBe(sectorPaths[2]);
    });

    it("should allow outerRadius callback to return number", () => {
      const data = [
        { name: "A", value: 40 },
        { name: "B", value: 30 },
        { name: "C", value: 20 },
      ];

      const readName = (dataPoint: unknown): unknown =>
        typeof dataPoint === "object" && dataPoint != null && "name" in dataPoint
          ? dataPoint.name
          : undefined;
      const outerRadiusCallback = (dataPoint: unknown): number => {
        const name = readName(dataPoint);
        if (name === "A") return 100;
        if (name === "B") return 150;
        return 200;
      };

      const { container } = render(() => (
        <PieChart width={500} height={500}>
          <Pie
            isAnimationActive={false}
            cx={250}
            cy={250}
            innerRadius={0}
            outerRadius={outerRadiusCallback}
            data={data}
            dataKey="value"
          />
        </PieChart>
      ));

      const sectors = container.querySelectorAll(".recharts-sector");
      expect(sectors).toHaveLength(3);

      const sectorPaths = Array.from(sectors).map((sector) => sector.getAttribute("d"));
      expect(sectorPaths[0]).not.toBe(sectorPaths[1]);
      expect(sectorPaths[1]).not.toBe(sectorPaths[2]);
      expect(sectorPaths[0]).not.toBe(sectorPaths[2]);
    });
  });
});

// Not in the recharts reference spec: covers the `strokeWidth` prop the reference
// forwards to every sector via its svg-props spread (Pie.tsx presentationProps).
describe("strokeWidth", () => {
  it("should forward the component-level strokeWidth to every sector path", () => {
    const { container } = render(() => (
      <PieChart width={500} height={500}>
        <Pie
          isAnimationActive={false}
          cx={250}
          cy={250}
          innerRadius={0}
          outerRadius={200}
          data={PageData}
          dataKey="uv"
          strokeWidth={5}
        />
      </PieChart>
    ));
    const sectors = container.querySelectorAll(".recharts-pie-sector .recharts-sector");
    expect(sectors).toHaveLength(PageData.length);
    sectors.forEach((sector) => {
      expect(sector.getAttribute("stroke-width")).toBe("5");
    });
  });

  it("should let a per-row strokeWidth win over the component prop", () => {
    const data = [
      { name: "A", value: 1, strokeWidth: 9 },
      { name: "B", value: 1 },
    ];
    const { container } = render(() => (
      <PieChart width={500} height={500}>
        <Pie isAnimationActive={false} data={data} dataKey="value" strokeWidth={2} />
      </PieChart>
    ));
    const sectors = container.querySelectorAll(".recharts-pie-sector .recharts-sector");
    expect(sectors).toHaveLength(2);
    expect(sectors[0]!.getAttribute("stroke-width")).toBe("9");
    expect(sectors[1]!.getAttribute("stroke-width")).toBe("2");
  });
});
