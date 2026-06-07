import { describe, test } from "vitest";
import { Pie, PieChart, type PieProps } from "../../../src";
import { PageData } from "../../_data";
import { render } from "../../helper/render";
import { expectPieSectors } from "../../helper/expectPieSectors";

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
  });
});
