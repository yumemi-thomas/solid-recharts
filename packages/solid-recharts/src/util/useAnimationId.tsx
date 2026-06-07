// Ported from recharts 3.8.1 src/util/useAnimationId.tsx (commit 7a23854).
//
// REACTIVE REDESIGN (see the porting-react-hooks-to-solid memory): recharts
// detects an input change across re-renders via refs (`prevProps !== input`).
// Solid components run once — there is no re-render to compare against — so the
// faithful Solid form takes `input` as an `Accessor` and returns an
// `Accessor<string>` backed by `createMemo`. The memo recomputes (yielding a
// fresh id) exactly when `input` changes by reference, and returns the cached id
// otherwise. Same behavior as recharts, expressed through Solid reactivity.
import { createMemo, type Accessor } from "solid-js";
import { uniqueId } from "./DataUtils";

/**
 * Returns a reactive unique animation id for the `input` accessor.
 * The id changes (new value) whenever `input` changes by reference equality,
 * and stays the same while `input` is unchanged.
 *
 * @param input Accessor for the object to watch (reference equality, `===`).
 * @param prefix Optional prefix for the animation id.
 * @returns An accessor for the current animation id.
 */
export function useAnimationId(
  input: Accessor<unknown>,
  prefix: string = "animation-",
): Accessor<string> {
  return createMemo(() => {
    // Track `input`; a new reference re-runs this compute → fresh id.
    input();
    return uniqueId(prefix);
  });
}
