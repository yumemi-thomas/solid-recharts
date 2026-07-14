import { onCleanup } from "solid-js";

/** Register a synchronous store unregistration on owner cleanup. */
export function unregisterOnCleanup(fn: () => void): void {
  onCleanup(fn);
}

/** Adapt a store unregistration for APIs that accept a cleanup callback. */
export function unregisterCleanup(fn: () => void): () => void {
  return fn;
}
