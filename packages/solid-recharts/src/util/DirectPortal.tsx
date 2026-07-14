import { createEffect, createRoot, on, onCleanup } from "solid-js";
import type { JSX } from "solid-js";
import { insert, isServer } from "solid-js/web";

export interface DirectPortalProps {
  mount: Element;
  children: JSX.Element;
}

interface PortalRange {
  placeholder: Text;
  start: Comment;
  end: Comment;
  sequence: number;
}

const rangesByMount = new WeakMap<Element, PortalRange[]>();
let nextSequence = 0;

function reorderRanges(mount: Element, ranges: PortalRange[]): void {
  ranges.sort((left, right) => {
    const position = left.placeholder.compareDocumentPosition(right.placeholder);
    if (position & Node.DOCUMENT_POSITION_FOLLOWING) {
      return -1;
    }
    if (position & Node.DOCUMENT_POSITION_PRECEDING) {
      return 1;
    }
    return left.sequence - right.sequence;
  });

  const fragment = document.createDocumentFragment();
  ranges.forEach((range) => {
    let node: Node | null = range.start;
    while (node != null) {
      const next: Node | null = node.nextSibling;
      fragment.append(node);
      if (node === range.end) {
        break;
      }
      node = next;
    }
  });
  mount.append(fragment);
}

/**
 * Portal content directly into a target without Solid 1's wrapper div/g.
 *
 * Recharts exposes the portal DOM shape, so the wrapper added by Solid 1's
 * built-in Portal would break direct-child selectors and SVG parity.
 */
export function DirectPortal(props: DirectPortalProps): JSX.Element {
  if (isServer) {
    return null;
  }

  const placeholder = document.createTextNode("");

  createEffect(
    on(
      () => props.mount,
      (mount) => {
        const start = document.createComment("solid-recharts-portal-start");
        const end = document.createComment("solid-recharts-portal-end");
        mount.append(start, end);

        const dispose = createRoot((disposeRoot) => {
          insert(mount, () => props.children, end);
          return disposeRoot;
        });
        const range: PortalRange = {
          placeholder,
          start,
          end,
          sequence: nextSequence,
        };
        nextSequence += 1;
        const ranges = rangesByMount.get(mount) ?? [];
        ranges.push(range);
        rangesByMount.set(mount, ranges);
        reorderRanges(mount, ranges);

        onCleanup(() => {
          dispose();
          let node: ChildNode | null = start.nextSibling;
          while (node != null && node !== end) {
            const next: ChildNode | null = node.nextSibling;
            node.remove();
            node = next;
          }
          start.remove();
          end.remove();
          const index = ranges.indexOf(range);
          if (index >= 0) {
            ranges.splice(index, 1);
          }
          if (ranges.length === 0) {
            rangesByMount.delete(mount);
          }
        });
      },
    ),
  );

  return placeholder;
}
