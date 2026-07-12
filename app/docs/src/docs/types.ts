import type { Component } from "solid-js";
import type { JSX } from "@solidjs/web";

export type DocGroup = "guides" | "charts" | "general" | "cartesian" | "polar";

export interface DocMeta {
  slug: string;
  title: string;
  group: DocGroup;
  description: string;
  example?: string;
  order?: number;
}

export interface MdxProps {
  // `(props: never) => JSX.Element` accepts any function component regardless
  // of its props shape (parameter contravariance) — the MDX runtime dispatches
  // to these dynamically, so the signatures can't be known here.
  readonly components?: Readonly<Record<string, (props: never) => JSX.Element>>;
}

export type MdxComponent = (props: MdxProps) => JSX.Element;

export interface DocModule {
  // MDX-compiled pages take the custom-components bag as a prop
  // (`<Dynamic component={…} components={mdxComponents} />`).
  default: Component<MdxProps>;
  meta: DocMeta;
}

export interface DocEntry extends DocMeta {
  Component: Component<MdxProps>;
}

export const groupLabels: Record<DocGroup, string> = {
  guides: "Guides",
  charts: "Charts",
  general: "General Components",
  cartesian: "Cartesian Components",
  polar: "Polar Components",
};

export const groupOrder: DocGroup[] = ["guides", "charts", "general", "cartesian", "polar"];
