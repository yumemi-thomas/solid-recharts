import type { JSX } from "@solidjs/web";
import { twMerge } from "tailwind-merge";

// Solid port of shadcn/ui card.tsx (new-york-v4). Class strings are kept
// verbatim; caller classes merge through tailwind-merge (like shadcn's cn())
// so conflicting utilities (e.g. py-0 vs the base py-6) resolve caller-wins.
interface SlotProps {
  class?: string;
  children?: JSX.Element;
}

export function Card(props: SlotProps): JSX.Element {
  return (
    <div
      data-slot="card"
      class={twMerge(
        "flex flex-col gap-6 rounded-xl border bg-card py-6 text-card-foreground shadow-sm",
        props.class,
      )}
    >
      {props.children}
    </div>
  );
}

export function CardHeader(props: SlotProps): JSX.Element {
  return (
    <div
      data-slot="card-header"
      class={twMerge(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        props.class,
      )}
    >
      {props.children}
    </div>
  );
}

export function CardTitle(props: SlotProps): JSX.Element {
  return (
    <div data-slot="card-title" class={twMerge("leading-none font-semibold", props.class)}>
      {props.children}
    </div>
  );
}

export function CardDescription(props: SlotProps): JSX.Element {
  return (
    <div data-slot="card-description" class={twMerge("text-sm text-muted-foreground", props.class)}>
      {props.children}
    </div>
  );
}

export function CardAction(props: SlotProps): JSX.Element {
  return (
    <div
      data-slot="card-action"
      class={twMerge("col-start-2 row-span-2 row-start-1 self-start justify-self-end", props.class)}
    >
      {props.children}
    </div>
  );
}

export function CardContent(props: SlotProps): JSX.Element {
  return (
    <div data-slot="card-content" class={twMerge("px-6", props.class)}>
      {props.children}
    </div>
  );
}

export function CardFooter(props: SlotProps): JSX.Element {
  return (
    <div
      data-slot="card-footer"
      class={twMerge("flex items-center px-6 [.border-t]:pt-6", props.class)}
    >
      {props.children}
    </div>
  );
}
