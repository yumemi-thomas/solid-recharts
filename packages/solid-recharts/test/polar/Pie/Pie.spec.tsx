import { describe, expect, it, test } from "vitest";
import { Pie, PieChart, Sector, Tooltip, type PieProps } from "../../../src";
import type { PieSectorDataItem } from "../../../src/polar/Pie";
import { PageData } from "../../_data";
import { render } from "../../helper/render";
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

    // Deferred (documented in Pie.tsx header): `activeShape` / element-form shape and
    // the shape-function `isActive` (hover) flag are not ported, so the two
    // "customized active sector on hover" tests are omitted.

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
