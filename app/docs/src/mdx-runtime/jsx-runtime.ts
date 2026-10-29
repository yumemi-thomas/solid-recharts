import { createComponent, type Component } from "solid-js";
import type { JSX } from "@solidjs/web";
import { Dynamic } from "@solidjs/web";

type MdxComponent = Component<Record<string, JSX.Element>>;

export function Fragment(props: { children?: JSX.Element }): JSX.Element {
  // eslint-disable-next-line solid/reactivity -- a fragment is a pure passthrough: the parent inserts whatever the component returns
  return props.children;
}

export function jsx(
  component: string | MdxComponent,
  props: Record<string, JSX.Element>,
): JSX.Element {
  const normalized = { ...props };
  if (normalized.className !== undefined) {
    normalized.class = normalized.className;
    delete normalized.className;
  }

  if (typeof component === "string") {
    return createComponent(Dynamic, { component, ...normalized });
  }

  return component(normalized);
}

export const jsxs = jsx;
export const jsxDEV = jsx;
