// The "is this event in the throttle allowlist" decision, shared verbatim by the
// mouse, keyboard, and external event middleware. Only the DECISION is shared:
// the timer-lifecycle downstream genuinely differs per middleware (mouse is
// trailing-only; keyboard and external are leading+trailing; external keys its
// timers per event type), so unifying the scheduling would change behavior and is
// deliberately left alone.
export function isEventThrottled(
  throttledEvents: ReadonlyArray<string> | "all" | undefined,
  eventName: string,
): boolean {
  return throttledEvents === "all" || (throttledEvents?.includes(eventName) ?? false);
}
