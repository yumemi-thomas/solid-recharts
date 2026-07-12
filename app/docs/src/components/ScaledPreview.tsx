import type { JSX } from "@solidjs/web";

// Card thumbnails: charts need a definite box to measure, but gallery cards are
// small and fluid. Pure-CSS width-fit: the preview area is a size container
// (`@container` in ExampleCard) and the fixed 560px stage scales by
// `100cqw / 560px` (length ÷ length → number), capped at 0.6 so small grids
// don't blow text up. Top-anchored so content taller than the frame (e.g. the
// interactive shadcn Cards) crops at the bottom instead of both edges — the
// zero-JS trade-off vs the previous measure-and-fit ResizeObserver.
export function ScaledPreview(props: { children: JSX.Element }) {
  return (
    <div
      class="pointer-events-none w-[560px] shrink-0 origin-top [scale:min(calc(100cqw/560px),0.6)]"
      aria-hidden="true"
    >
      {props.children}
    </div>
  );
}
