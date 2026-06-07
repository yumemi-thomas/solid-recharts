// Vendored from @solidjs/testing-library (next branch — Solid 2.0
// port not yet published to npm at the time of writing).
// Source: https://github.com/solidjs/solid-testing-library/blob/next/src/types.ts
// MIT licensed; copyright © Ryan Carniato, Alex Lohr.
//
// Part of the @solid-recharts/testing-library workspace package. Kept close to
// upstream so a future re-sync stays mechanical.

import type { Accessor, Component, Owner, Setter } from "solid-js";
import type { JSX } from "@solidjs/web";
import { queries } from "@testing-library/dom";
import type { Queries, BoundFunctions, PrettyDOMOptions } from "@testing-library/dom";

export interface Ref {
  container?: HTMLElement;
  dispose: () => void;
}

export type Ui = () => JSX.Element;

export interface Options {
  container?: HTMLElement;
  baseElement?: HTMLElement;
  queries?: Queries & typeof queries;
  hydrate?: boolean;
  wrapper?: Component<{ children: JSX.Element }>;
  readonly location?: string;
}

export type DebugFn = (
  baseElement?: HTMLElement | HTMLElement[],
  maxLength?: number,
  options?: PrettyDOMOptions,
) => void;

export type Result = BoundFunctions<typeof queries> & {
  asFragment: () => string;
  container: HTMLElement;
  baseElement: HTMLElement;
  debug: DebugFn;
  unmount: () => void;
};

export type RenderHookOptions<A> = {
  initialProps?: A;
  wrapper?: Component<{ children: JSX.Element }>;
};

export type RenderHookResult<R> = {
  result: R;
  owner: Owner | null;
  cleanup: () => void;
};

export type RenderRefOptions<E extends HTMLElement = HTMLDivElement> = Options & {
  targetElement?: Lowercase<E["nodeName"]> | E | (() => E);
};

// Re-export unused imports so the build doesn't warn.
export type { Accessor, Setter };
