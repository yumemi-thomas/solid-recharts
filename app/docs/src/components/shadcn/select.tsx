import { For } from "solid-js";
import type { JSX } from "@solidjs/web";

// Minimal stand-in for shadcn/ui's Radix Select, used by the two interactive
// chart examples. A styled native <select> — no popper/portal machinery.
export function Select(props: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  class?: string;
  "aria-label"?: string;
}): JSX.Element {
  return (
    <select
      data-slot="select"
      aria-label={props["aria-label"]}
      class={[
        "h-8 rounded-lg border border-input bg-background pr-2 pl-2.5 text-xs font-medium text-foreground shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        props.class,
      ]}
      onChange={(e) => props.onChange(e.currentTarget.value)}
    >
      <For each={props.options}>
        {(option) => (
          <option value={option.value} selected={option.value === props.value}>
            {option.label}
          </option>
        )}
      </For>
    </select>
  );
}
