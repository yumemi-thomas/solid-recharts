import { createEffect, on } from "solid-js";
// The register-while-mounted idiom, concentrated.
//
// A graphical item / axis / reference element / tooltip / legend entry adds its
// settings to the chart store while it is mounted and removes them on unmount.
// Every such component used to hand-roll the identical dance: a two-argument
// `createEffect(on(compute, apply))` (the compute phase builds the settings, the
// apply phase adds-or-replaces — this shape is what keeps the reactive reads out
// of the apply body, avoiding STRICT_READ_UNTRACKED), reference-based add/replace
// tracking through a `let prev`, and an `unregisterOnCleanup` removal (which runs
// the store write owner-free via `runWithOwner(null)`, avoiding
// SIGNAL_WRITE_IN_OWNED_SCOPE on subtree disposal).
//
// This module owns that shell so every caller states only what genuinely varies:
// how to compute its settings, and the three store actions. Both Solid
// invariants above are now true by construction at every call site.
//
// Control signal: `compute` returning `undefined` skips the tick without touching
// `prev` — exactly the early-return the sites used for every guard (store absent,
// inside a Panorama, an axis whose type is not yet resolved). Callers fold those
// guards into the compute closure, so there is a single skip path.
import { unregisterOnCleanup } from "./unregisterOnCleanup";

/**
 * The three store writes a registration performs. `add` runs on first registration,
 * `replace` when the computed settings change, `remove` on unmount.
 *
 * Slices without a dedicated replace action compose one: reference elements pass
 * `replace: (prev, next) => { remove(prev); add(next); }`, and slices whose `add`
 * overwrites by id (the polar axes) pass `replace: (_prev, next) => add(next)`.
 */
export interface StoreRegistrationHandlers<T> {
  add(next: T): void;
  replace(prev: T, next: T): void;
  remove(prev: T): void;
}

/**
 * Register `compute()`'s value in the store for as long as the calling component
 * is mounted. Returns `undefined` from `compute` to skip (no write, `prev`
 * untouched). Must be called synchronously during component setup so the effect
 * and cleanup bind to the component's owner.
 */
export function registerInStore<T>(
  compute: () => T | undefined,
  handlers: StoreRegistrationHandlers<T>,
): void {
  let prev: T | null = null;

  createEffect(
    on(compute, (next: T | undefined) => {
      if (next == null) {
        return;
      }
      if (prev === null) {
        handlers.add(next);
      } else if (prev !== next) {
        handlers.replace(prev, next);
      }
      prev = next;
    }),
  );

  unregisterOnCleanup(() => {
    if (prev !== null) {
      handlers.remove(prev);
      prev = null;
    }
  });
}
