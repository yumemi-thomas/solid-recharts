// Regression: <ZIndexLayer> renders its children through a <Portal> when zIndex≠0.
// The portal target settles asynchronously, so the <Portal> is created during a
// flush; Solid's runEffect runs an effect's APPLY phase without re-establishing the
// effect as owner, so <Portal>'s apply-phase insert() would create child
// render-effects with no owner (NO_OWNER_EFFECT — they never dispose). The fix
// captures the component owner (getOwner) and re-establishes it around the Portal
// (runWithOwner) + keys the target Show. These tests fail (NO_OWNER) without it; the
// test/setup.ts global guard turns any NO_OWNER_EFFECT into a failure.
import { describe, expect, it } from "vitest";
import { createSignal, flush } from "solid-js";
import type { JSX } from "@solidjs/web";
import { render, fireEvent } from "../helper/render";
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
} {
  const registry = createRegistry();
  const [data, setData] = createSignal<typeof small>(small);
  const [next, setNext] = createSignal<typeof small | null>(null);
  const { container } = render(() => (
    <AnimationControllerProvider value={registry.controller}>
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
    </AnimationControllerProvider>
  )) as { container: HTMLElement };
  flush();
  const button = container.querySelector<HTMLButtonElement>('[data-testid="swap"]');
  if (button == null) throw new Error("no button");
  return {
    setData: (d) => {
      setNext(() => d);
      flush();
      fireEvent.click(button);
      flush();
    },
    registry,
  };
}

describe("ZIndexLayer/Portal leak", () => {
  it("two coexisting BarCharts must not leak NO_OWNER", () => {
    const node = (): JSX.Element => (
      <BarChart width={200} height={200} data={small}>
        <Bar dataKey="uv" isAnimationActive={false} />
      </BarChart>
    );
    render(node);
    flush();
    flush();
    render(node);
    flush();
    flush();
    expect(true).toBe(true);
  });

  it("re-animation across grow + shrink (with background) must not leak", async () => {
    const r = renderChart(true);
    await r.registry.current().completeAnimation();
    flush();
    r.setData(large);
    await r.registry.current().setAnimationProgress(0.5);
    flush();
    await r.registry.current().completeAnimation();
    flush();
    r.setData(small);
    await r.registry.current().completeAnimation();
    flush();
    expect(true).toBe(true);
  });
});
