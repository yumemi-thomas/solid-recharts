// The register-while-mounted idiom: a component adds its settings to the chart
// store in an effect and removes them again when it unmounts. The removal is
// the one lifecycle moment where a store write is otherwise illegal: when the
// router (or a <Show>) disposes a subtree, `onCleanup` callbacks run inside the
// disposing computation's context, and Solid 2.0 throws
// SIGNAL_WRITE_IN_OWNED_SCOPE for any signal/store write made there.
//
// An unregistration is not derived state — it is an external transition on a
// store that outlives the component — so it must not execute under the dying
// scope. `runWithOwner(null, …)` runs the callback owner- and context-free,
// which is the documented way to "move the write outside" without deferring it
// (synchronous removal keeps selector state consistent within the same flush).
import { onCleanup, runWithOwner } from "solid-js";

/** `onCleanup` for store unregistrations: runs `fn` outside the disposing scope. */
export function unregisterOnCleanup(fn: () => void): void {
  onCleanup(() => runWithOwner(null, fn));
}

/**
 * Same escape for cleanups *returned* from an effect apply phase or `onSettled`
 * (those also run inside the disposing computation's context on unmount).
 */
export function unregisterCleanup(fn: () => void): () => void {
  return () => runWithOwner(null, fn);
}
