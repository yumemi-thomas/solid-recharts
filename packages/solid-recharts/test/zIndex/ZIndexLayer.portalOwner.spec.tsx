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
import { AnimationManagerContext } from "../../src/animation/useAnimationManager";
import { MockProgressAnimationManager } from "../animation/MockProgressAnimationManager";
import { PageData } from "../_data";

const small = PageData.slice(0, 2);
const large = PageData.slice(0, 3);

function createRegistry(): {
  factory: (id: string) => MockProgressAnimationManager;
  current: () => MockProgressAnimationManager;
} {
  const managers = new Map<string, MockProgressAnimationManager>();
  let latest: MockProgressAnimationManager | null = null;
  return {
    factory: (id) => {
      const existing = managers.get(id);
      if (existing != null) {
        latest = existing;
        return existing;
      }
      const m = new MockProgressAnimationManager(id);
      managers.set(id, m);
      latest = m;
      return m;
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
    <AnimationManagerContext value={registry.factory}>
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
    </AnimationManagerContext>
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
