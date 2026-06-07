// Vendored from @solidjs/testing-library (next branch — Solid 2.0
// port not yet published to npm at the time of writing).
// Source: https://github.com/solidjs/solid-testing-library/blob/next/src/index.ts
// MIT licensed; copyright © Ryan Carniato, Alex Lohr.
//
// Lives in its own workspace package (@solid-recharts/testing-library) so the
// library and apps can share one render harness. Kept as close to upstream as
// the 2.0 API rename allows so a future re-sync (or a swap to the published
// npm package) stays mechanical.

import { getQueriesForElement, prettyDOM, type PrettyDOMOptions } from "@testing-library/dom";
import {
  createComponent,
  createErrorBoundary,
  createRoot,
  flush,
  getOwner,
  onSettled,
  runWithOwner,
  type Owner,
} from "solid-js";
import { hydrate as solidHydrate, render as solidRender } from "@solidjs/web";

import type {
  Ui,
  Result,
  Options,
  Ref,
  RenderHookResult,
  RenderHookOptions,
  RenderRefOptions,
} from "./types";

/* type extension for hydration context */
declare global {
  var _$HY: object;
}

/**
 * Solid.js 2.0 no longer supports directives, so this function has been replaced with renderRef
 * @deprecated
 *
 * ```ts
 * // before
 * const directive = (ref, arg) => ...;
 * const { arg, setArg } = renderDirective(directive, { targetElement });
 *
 * // after
 * const [arg, setArg] = createSignal();
 * const refHandler = (arg) => (ref) => ...;
 * renderRef(ref(arg), { targetElement });
 * ```
 */
export function renderDirective(
  _directive: (_ref: HTMLElement, _arg: Function) => void,
  _options: { targetElement?: HTMLElement | string } = {},
): void {
  throw new Error("Solid-2.0 no longer supports directives. Use ref instead.");
}

/* istanbul ignore next */
// @ts-ignore — `process` may not be in lib.dom; node types may not be loaded
if (typeof process === "undefined" || !process.env.STL_SKIP_AUTO_CLEANUP) {
  // @ts-ignore — afterEach is provided by the test runner (vitest globals)
  if (typeof afterEach === "function") {
    // @ts-ignore
    afterEach(cleanup);
  }
}

const mountedContainers = new Set<Ref>();

/**
 * Renders a component to test it.
 */
function render(ui: Ui, options: Options = {}): Result {
  let { container, baseElement = container, queries, hydrate = false, wrapper } = options;

  if (!baseElement) {
    baseElement = document.body;
  }

  if (!container) {
    container = baseElement.appendChild(document.createElement("div"));
  }

  const wrappedUi: Ui =
    typeof wrapper === "function"
      ? () =>
          createComponent(wrapper!, {
            get children() {
              return createComponent(ui, {});
            },
          })
      : ui;

  const dispose = hydrate ? solidHydrate(wrappedUi, container) : solidRender(wrappedUi, container);

  mountedContainers.add({ container, dispose });

  const queryHelpers = getQueriesForElement(container, queries);

  return {
    asFragment: () => container?.innerHTML as string,
    container,
    baseElement,
    debug: (el = baseElement, maxLength?: number, options?: PrettyDOMOptions) =>
      Array.isArray(el)
        ? el.forEach((e) => console.log(prettyDOM(e, maxLength, options)))
        : console.log(prettyDOM(el, maxLength, options)),
    unmount: dispose,
    ...queryHelpers,
  } as Result;
}

const hasInitialProps = <A>(
  options: RenderHookOptions<A> | A | {},
): options is RenderHookOptions<A> =>
  Array.isArray((options as RenderHookOptions<A>)?.initialProps);

/**
 * "Renders" a hook to test it.
 */
function renderHook<A extends [] | [any, ...any[]], R>(
  hook: (...args: A) => R,
  options: A | RenderHookOptions<A> = [] as A,
): RenderHookResult<R> {
  const initialProps: A = Array.isArray(options as A)
    ? (options as A)
    : hasInitialProps(options)
      ? (options.initialProps as A)
      : ([] as A);
  const wrapper = Object.hasOwn(options, "wrapper") && (options as RenderHookOptions<A>).wrapper!;

  const container = document.createElement("div");
  document.body.appendChild(container);
  let result;
  let owner: Owner | null = null;
  const Comp = () => {
    flush();
    result = hook(...initialProps);
    owner = getOwner();
    return null;
  };
  const wrapped = wrapper
    ? () =>
        createComponent(wrapper, {
          get children() {
            return createComponent(Comp, {});
          },
        })
    : () => createComponent(Comp, {});
  const dispose = solidRender(wrapped, container);
  mountedContainers.add({ container, dispose });
  flush();
  return { result: result!, cleanup: dispose, owner };
}

/**
 * Applies ref(s) to a test container.
 */
function renderRef<E extends HTMLElement>(
  ref: ((ref: E) => void) | ((ref: E) => void)[],
  options: RenderRefOptions<E> = {},
): Result {
  return render(() => {
    const targetElement =
      (options?.targetElement &&
        (options.targetElement instanceof HTMLElement
          ? options.targetElement
          : typeof options.targetElement === "string"
            ? document.createElement(options.targetElement)
            : typeof options.targetElement === "function"
              ? options.targetElement()
              : undefined)) ||
      document.createElement("div");
    onSettled(() =>
      Array.isArray(ref) ? ref.forEach((r) => r(targetElement as E)) : ref(targetElement as E),
    );
    return targetElement;
  });
}

const rootOrOwner = (owner: Owner | null | undefined, fn: (dispose?: () => void) => void) =>
  owner ? runWithOwner(owner, fn) : createRoot(fn);

/**
 * testEffect — provides an asynchronous scaffold to test effects in unit tests.
 */
function testEffect<T>(
  testee: (done: undefined extends T ? (result?: T) => void : (result: T) => void) => void,
  owner: Owner | null = null,
): Promise<T> {
  return new Promise((done, fail) =>
    rootOrOwner(owner, (dispose) =>
      createErrorBoundary(
        () => testee((result: any) => (done(result), dispose?.())),
        // `createErrorBoundary`'s fallback receives the error as an
        // `Accessor<unknown>` (per solid-js 2.0 beta types), so call it to get
        // the value — matches upstream solid-testing-library@next.
        (err) => (fail(err()), queueMicrotask(() => dispose?.())),
      )(),
    ),
  );
}

function cleanupAtContainer(ref: Ref) {
  const { container, dispose } = ref;
  if (typeof dispose === "function") {
    dispose();
  } else {
    console.warn(
      "solid-testing-library: dispose is not a function - maybe your tests include multiple solid versions!",
    );
  }

  if (container?.parentNode === document.body) {
    document.body.removeChild(container);
  }

  mountedContainers.delete(ref);
}

function cleanup() {
  mountedContainers.forEach(cleanupAtContainer);
}

export * from "@testing-library/dom";
export { render, renderHook, renderRef, testEffect, cleanup };
