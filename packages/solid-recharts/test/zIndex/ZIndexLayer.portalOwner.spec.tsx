// Regression coverage for z-index portal ownership and disposal. Solid 1 has no
// structured owner diagnostics, so these tests assert observable DOM cleanup:
// unmounting one chart must not affect another, and animated remounts must leave
// exactly one final set of bar/background portal children.
import { describe, expect, it } from "vitest";
import { createSignal } from "solid-js";
import type { JSX } from "solid-js";
import { render, fireEvent } from "@solidjs/testing-library";
import { BarChart, Bar } from "../../src";
import type { AnimationController } from "../../src";
import { AnimationControllerProvider } from "../../src/animation/useAnimationController";
import { MockControllerAnimationManager } from "../animation/mockControllerAnimationManager";
import { PageData } from "../_data";

const small = PageData.slice(0, 2);
const large = PageData.slice(0, 3);

// Bar runs on the v3.9 animation engine, so we drive it through an injected
// AnimationController that routes per-id (via handle.getAnimationId()) to a
// MockControllerAnimationManager — a remount's stop() on the old id then never
// clobbers the new id's manager.
function createRegistry(): {
  controller: AnimationController;
  current: () => MockControllerAnimationManager;
} {
  const managers = new Map<string, MockControllerAnimationManager>();
  let latest: MockControllerAnimationManager | null = null;
  return {
    controller: (timeoutController, animationHandle, listener) => {
      const id = animationHandle.getAnimationId();
      let m = managers.get(id);
      if (m == null) {
        m = new MockControllerAnimationManager(id);
        managers.set(id, m);
      }
      latest = m;
      m.start(animationHandle, listener);
      return () => m.stop();
    },
    current: () => {
      if (latest == null) throw new Error("no manager yet");
      return latest;
    },
  };
}

// Swap data via an in-tree button click so the data-change re-render happens
// inside the render owner (mirrors the legacy harness).
function renderChart(background: boolean): {
  setData: (d: typeof small) => void;
  registry: ReturnType<typeof createRegistry>;
  container: HTMLElement;
} {
  const registry = createRegistry();
  const [data, setData] = createSignal<typeof small>(small);
  const [next, setNext] = createSignal<typeof small | null>(null);
  const { container } = render(() => (
    <AnimationControllerProvider.Provider value={registry.controller}>
      <button
        type="button"
        data-testid="swap"
        onClick={() => {
          const n = next();
          if (n != null) setData(() => n);
        }}
      />
      <BarChart width={200} height={200} data={data()}>
        <Bar
          dataKey="uv"
          background={background}
          isAnimationActive
          animationDuration={1000}
          animationEasing="linear"
        />
      </BarChart>
    </AnimationControllerProvider.Provider>
  )) as { container: HTMLElement };
  const button = container.querySelector<HTMLButtonElement>('[data-testid="swap"]');
  if (button == null) throw new Error("no button");
  return {
    setData: (d) => {
      setNext(() => d);
      fireEvent.click(button);
    },
    registry,
    container,
  };
}

describe("ZIndexLayer/Portal leak", () => {
  it("unmounts one of two coexisting BarCharts without affecting the other", () => {
    const node = (): JSX.Element => (
      <BarChart width={200} height={200} data={small}>
        <Bar dataKey="uv" isAnimationActive={false} />
      </BarChart>
    );
    const first = render(node);
    const second = render(node);

    expect(first.container.querySelectorAll(".recharts-bar-rectangle")).toHaveLength(small.length);
    expect(second.container.querySelectorAll(".recharts-bar-rectangle")).toHaveLength(small.length);

    first.unmount();
    expect(first.container).toBeEmptyDOMElement();
    expect(second.container.querySelectorAll(".recharts-bar-rectangle")).toHaveLength(small.length);
  });

  it("re-animation across grow + shrink (with background) must not leak", async () => {
    const r = renderChart(true);
    await r.registry.current().completeAnimation();
    r.setData(large);
    await r.registry.current().setAnimationProgress(0.5);
    await r.registry.current().completeAnimation();
    r.setData(small);
    await r.registry.current().completeAnimation();

    expect(r.container.querySelectorAll(".recharts-bar-rectangle")).toHaveLength(small.length);
    expect(r.container.querySelectorAll(".recharts-bar-background-rectangle")).toHaveLength(
      small.length,
    );
  });
});
