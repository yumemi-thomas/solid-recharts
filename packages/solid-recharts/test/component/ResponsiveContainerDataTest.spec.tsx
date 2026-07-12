import { describe, expect, test } from "vitest";
import { render } from "@solidjs/testing-library";
import { ResponsiveContainer, BarChart, Bar } from "../../src";
import { assertNotNull } from "../helper/assertNotNull";

/*
 * Ported from recharts 3.8.1 test/component/ResponsiveContainerDataTest.spec.tsx.
 * Solid adaptations: React render -> Solid render(() => <…/>).
 */

describe("ResponsiveContainer Data Attributes", () => {
  test("should pass down data-testid to the root div", () => {
    const { container } = render(() => (
      <ResponsiveContainer
        data-testid="my-container"
        initialDimension={{ width: 100, height: 100 }}
      >
        <BarChart width={100} height={100} data={[]}>
          <Bar dataKey="value" />
        </BarChart>
      </ResponsiveContainer>
    ));

    const div = container.querySelector('[data-testid="my-container"]');
    expect(div).not.toBeNull();
  });

  test("should forward arbitrary HTML attributes onto the root div", () => {
    const { container } = render(() => (
      <ResponsiveContainer
        data-testid="my-container"
        role="img"
        aria-label="Sales chart"
        data-custom="hello"
        initialDimension={{ width: 100, height: 100 }}
      >
        <BarChart width={100} height={100} data={[]}>
          <Bar dataKey="value" />
        </BarChart>
      </ResponsiveContainer>
    ));

    const div = container.querySelector<HTMLDivElement>('[data-testid="my-container"]');
    assertNotNull(div);
    expect(div.getAttribute("role")).toBe("img");
    expect(div.getAttribute("aria-label")).toBe("Sales chart");
    expect(div.getAttribute("data-custom")).toBe("hello");
    // The wrapper class and managed style must remain intact.
    expect(div.classList.contains("recharts-responsive-container")).toBe(true);
  });
});
