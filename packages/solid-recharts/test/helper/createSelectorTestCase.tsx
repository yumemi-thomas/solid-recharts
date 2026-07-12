// Solid-native, reduced port of recharts 3.8.1 test/helper/createSelectorTestCase.tsx.
//
// recharts renders a chart + a Spy component that calls a hook/selector and spies
// its RETURN per React render, plus wires AnimationManager mocks and runs fake
// timers. Our chart hooks/selectors return Accessors, and there's no Redux
// autobatch, so this is simpler: render the chart with a Spy child that spies the
// VALUE — via an effect for accessor results, directly for plain-value results.
// (No animation-manager wiring; the empty chart doesn't need it.)
import { createEffect, createSignal, flush } from "solid-js";
import type { JSX } from "@solidjs/web";
import { vi, type Mock } from "vitest";
import { render } from "./render";
import { useAppSelector, useAppStore } from "../../src/state/hooks";
import type { RechartsRootState } from "../../src/state/store";

// The wrapper MUST read `props.children` inside its JSX (never destructure) so
// the Spy child getter stays lazy and runs inside the chart's store context.
// See the test-wrapper-no-destructure-children memory.
type Wrapper = (props: { children: JSX.Element }) => JSX.Element;
type HookOrSelector<T> = (() => T) | ((state: RechartsRootState) => T);

function isHook(fn: { name: string }): boolean {
  return /^use[A-Z]/.test(fn.name);
}

/** Zero-arg arrow wrappers like `() => useStackId(...)` invoke hooks inside Spy. */
function isHookWrapper(fn: HookOrSelector<unknown>): fn is () => unknown {
  return fn.length === 0;
}

export function createSelectorTestCase(Component: Wrapper) {
  return function renderTestCase<T>(selectorOrHook?: HookOrSelector<T>): {
    container: HTMLElement;
    spy: Mock;
    rerenderSameComponent: () => void;
    unmount: () => void;
  } {
    const spy: Mock = vi.fn();
    const [version, setVersion] = createSignal(0);

    const StoreCapture = (): null => {
      useAppStore();
      return null;
    };

    const Spy = (): JSX.Element => {
      if (selectorOrHook == null) {
        return null;
      }
      // A hook (name `use…`) returns its own (often accessor) value; a plain
      // selector is read through useAppSelector (→ accessor).
      const result: unknown =
        isHook(selectorOrHook) || isHookWrapper(selectorOrHook)
          ? (selectorOrHook as () => unknown)()
          : useAppSelector(selectorOrHook as (state: RechartsRootState) => unknown);

      if (typeof result === "function") {
        // Accessor: spy its value, re-running as it settles.
        const accessor = result as () => unknown;
        createEffect(
          () => {
            version();
            return accessor();
          },
          (value) => spy(value),
        );
      } else {
        spy(result);
      }
      return null;
    };

    // `<Spy />` compiles to a lazy `get children()` getter; the wrapper must read
    // `props.children` inside its JSX so the Spy mounts INSIDE the chart store.
    const { container, unmount } = render(() => (
      <Component>
        <StoreCapture />
        <Spy />
      </Component>
    ));
    // Store writes are microtask-batched, and registration effects (axes/ticks/
    // items) dispatch during flush. Drain a few times so everything settles.
    flush();
    flush();
    flush();
    const rerenderSameComponent = (): void => {
      setVersion((v) => v + 1);
      flush();
      flush();
      flush();
    };

    return { container, spy, rerenderSameComponent, unmount };
  };
}

/**
 * Solid-native, reduced port of recharts' `createSynchronisedSelectorTestCase`.
 * Renders TWO (or three) chart wrappers side by side, each with its own store and
 * a Spy reading `selector` against that store — used to assert cross-chart sync
 * receipt (one chart hovers, the other's state updates via the sync registry).
 *
 * Each wrapper MUST read `props.children` inside its JSX (never destructure) so
 * the Spy mounts inside that chart's store (test-wrapper-no-destructure-children).
 */
export function createSynchronisedSelectorTestCase(
  ComponentA: Wrapper,
  ComponentB: Wrapper,
  ComponentC?: Wrapper,
) {
  return function renderTestCase<T>(selector?: (state: RechartsRootState) => T): {
    container: HTMLElement;
    wrapperA: Element;
    wrapperB: Element;
    wrapperC: Element | null;
    spyA: Mock;
    spyB: Mock;
    spyC: Mock;
    unmount: () => void;
  } {
    const spyA: Mock = vi.fn();
    const spyB: Mock = vi.fn();
    const spyC: Mock = vi.fn();

    const makeSpy =
      (spy: Mock): (() => null) =>
      (): null => {
        if (selector == null) {
          return null;
        }
        const accessor = useAppSelector(selector);
        createEffect(
          () => accessor(),
          (value) => spy(value),
        );
        return null;
      };
    const SpyA = makeSpy(spyA);
    const SpyB = makeSpy(spyB);
    const SpyC = makeSpy(spyC);

    const { container, unmount } = render(() => (
      <>
        <div id="wrapperA">
          <ComponentA>
            <SpyA />
          </ComponentA>
        </div>
        <div id="wrapperB">
          <ComponentB>
            <SpyB />
          </ComponentB>
        </div>
        {ComponentC != null ? (
          <div id="wrapperC">
            <ComponentC>
              <SpyC />
            </ComponentC>
          </div>
        ) : null}
      </>
    ));
    flush();
    flush();
    flush();

    const wrapperA = container.querySelector("#wrapperA");
    const wrapperB = container.querySelector("#wrapperB");
    const wrapperC = container.querySelector("#wrapperC");
    if (wrapperA == null || wrapperB == null) {
      throw new Error("synchronised test case wrappers failed to render");
    }

    return { container, spyA, spyB, spyC, wrapperA, wrapperB, wrapperC, unmount };
  };
}
