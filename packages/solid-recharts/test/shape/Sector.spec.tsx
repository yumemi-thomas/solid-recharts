// Ported from recharts 3.8.1 test/shape/Sector.spec.tsx.
// Harness changes only: render from the local Solid shim (thunk), no React
// import. Assertions are byte-identical (snapshots self-record; the
// `.recharts-sector` presence/count + arc-count are the parity signal).
import { render } from "../helper/render";

import { Surface, Sector } from "../../src";

describe("<Sector />", () => {
  test("Render 1 sector in simple Sector", () => {
    const { container } = render(() => (
      <Surface width={500} height={500}>
        <Sector
          fill="#ff7902"
          cx={200}
          cy={300}
          innerRadius={150}
          outerRadius={200}
          endAngle={90}
        />
      </Surface>
    ));
    const sector = container.querySelector(".recharts-sector");
    expect(sector?.classList.contains("recharts-sector")).toBeTruthy();
    expect(container).toMatchSnapshot();
  });

  test("Render 1 sector when cornerRadius > 0", () => {
    const { container } = render(() => (
      <Surface width={500} height={500}>
        <Sector
          fill="#ff7902"
          cx={200}
          cy={300}
          innerRadius={150}
          outerRadius={200}
          cornerRadius={10}
          endAngle={90}
        />
      </Surface>
    ));

    const sectors = container.querySelectorAll(".recharts-sector");
    expect(sectors).toHaveLength(1);
    const path = sectors[0]?.getAttribute("d") ?? "";
    expect(path).not.toBeFalsy();
    expect(path.length - path.split("A").join("").length).toBe(6);
    expect(container).toMatchSnapshot();
  });

  test("Don't render any sector when props is invalid", () => {
    const { container } = render(() => (
      <Surface width={500} height={500}>
        <Sector
          fill="#ff7902"
          cx={200}
          cy={300}
          innerRadius={200}
          outerRadius={150}
          endAngle={90}
        />
        <Sector
          fill="#ff7902"
          cx={200}
          cy={300}
          innerRadius={150}
          outerRadius={200}
          startAngle={90}
          endAngle={90}
        />
      </Surface>
    ));
    expect(container.querySelectorAll(".recharts-sector")).toHaveLength(0);
    expect(container).toMatchSnapshot();
  });
});
