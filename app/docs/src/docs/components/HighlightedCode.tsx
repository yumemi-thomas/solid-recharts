import { For, Match, Switch } from "solid-js";
import type { JSX } from "@solidjs/web";
import { Dynamic } from "@solidjs/web";
import type { HighlightedNode, HighlightedTree } from "../highlighter";

// Renders shiki's syntax tree (hast) as elements, so highlighted code reaches the page
// without `innerHTML`. shiki only emits `<pre>`, `<code>` and `<span>`s with a class
// list, an inline `style` string and `tabindex`.

type Properties = Record<string, unknown>;

function parseStyle(style: string): Record<string, string> {
  const parsed: Record<string, string> = {};
  for (const declaration of style.split(";")) {
    const separator = declaration.indexOf(":");
    if (separator > 0) {
      parsed[declaration.slice(0, separator).trim()] = declaration.slice(separator + 1).trim();
    }
  }
  return parsed;
}

/** hast property names (JS-cased) to the attributes Solid sets. */
function attributes(properties: Properties): Properties {
  const attrs: Properties = {};
  for (const [name, value] of Object.entries(properties)) {
    if (name === "className") {
      attrs.class = value;
    } else if (name === "style" && typeof value === "string") {
      attrs.style = parseStyle(value);
    } else if (name === "tabIndex") {
      attrs.tabindex = value;
    } else if (typeof value === "string" || typeof value === "number") {
      attrs[name] = value;
    }
  }
  return attrs;
}

function textOf(node: HighlightedNode): string | undefined {
  return node.type === "text" ? node.value : undefined;
}

function elementOf(node: HighlightedNode): (HighlightedNode & { type: "element" }) | undefined {
  return node.type === "element" ? node : undefined;
}

function HastNode(props: { node: HighlightedNode }): JSX.Element {
  return (
    <Switch>
      <Match when={textOf(props.node)}>{(value) => value()}</Match>
      <Match when={elementOf(props.node)}>
        {(element) => (
          <Dynamic component={element().tagName} {...attributes(element().properties)}>
            <For each={element().children}>{(child) => <HastNode node={child} />}</For>
          </Dynamic>
        )}
      </Match>
    </Switch>
  );
}

export function HighlightedCode(props: { tree: HighlightedTree }): JSX.Element {
  return <For each={props.tree.children}>{(node) => <HastNode node={node} />}</For>;
}
