import type { JSX } from "@solidjs/web";

// Hand-rolled lucide icons (lucide.dev, ISC) — only the ones the shadcn chart
// examples use. Plain SVG elements, so kebab-case attributes apply.
interface IconProps {
  class?: string;
}

function LucideIcon(props: IconProps & { name: string; children: JSX.Element }): JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class={["lucide", `lucide-${props.name}`, props.class]}
      aria-hidden="true"
    >
      {props.children}
    </svg>
  );
}

export function TrendingUp(props: IconProps): JSX.Element {
  return (
    <LucideIcon name="trending-up" class={props.class}>
      <path d="M16 7h6v6" />
      <path d="m22 7-8.5 8.5-5-5L2 17" />
    </LucideIcon>
  );
}

export function TrendingDown(props: IconProps): JSX.Element {
  return (
    <LucideIcon name="trending-down" class={props.class}>
      <path d="M16 17h6v-6" />
      <path d="m22 17-8.5-8.5-5 5L2 7" />
    </LucideIcon>
  );
}

export function Activity(props: IconProps): JSX.Element {
  return (
    <LucideIcon name="activity" class={props.class}>
      <path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2" />
    </LucideIcon>
  );
}

export function ArrowUpFromLine(props: IconProps): JSX.Element {
  return (
    <LucideIcon name="arrow-up-from-line" class={props.class}>
      <path d="m18 9-6-6-6 6" />
      <path d="M12 3v14" />
      <path d="M5 21h14" />
    </LucideIcon>
  );
}

export function ArrowDownFromLine(props: IconProps): JSX.Element {
  return (
    <LucideIcon name="arrow-down-from-line" class={props.class}>
      <path d="M19 3H5" />
      <path d="M12 21V7" />
      <path d="m6 15 6 6 6-6" />
    </LucideIcon>
  );
}

export function Footprints(props: IconProps): JSX.Element {
  return (
    <LucideIcon name="footprints" class={props.class}>
      <path d="M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 10 3.8 10 5.5c0 3.11-2 5.66-2 8.68V16a2 2 0 1 1-4 0Z" />
      <path d="M20 20v-2.38c0-2.12 1.03-3.12 1-5.62-.03-2.72-1.49-6-4.5-6C14.63 6 14 7.8 14 9.5c0 3.11 2 5.66 2 8.68V20a2 2 0 1 0 4 0Z" />
      <path d="M16 17h4" />
      <path d="M4 13h4" />
    </LucideIcon>
  );
}

export function Waves(props: IconProps): JSX.Element {
  return (
    <LucideIcon name="waves" class={props.class}>
      <path d="M2 12q2.5 2 5 0t5 0 5 0 5 0" />
      <path d="M2 19q2.5 2 5 0t5 0 5 0 5 0" />
      <path d="M2 5q2.5 2 5 0t5 0 5 0 5 0" />
    </LucideIcon>
  );
}

export function GitCommitVertical(props: IconProps): JSX.Element {
  return (
    <LucideIcon name="git-commit-vertical" class={props.class}>
      <path d="M12 3v6" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 15v6" />
    </LucideIcon>
  );
}
