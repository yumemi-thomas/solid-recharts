// Slice immutability contract helper (ADR-0002).
//
// Slices must not mutate nested state in place — a changed value must have a
// new reference all the way up to the slice-root property, because the
// selector graph invalidates by input-reference comparison. `patched` is the
// replacement write: it returns `{ ...current, ...patch }` when some patched
// field actually differs, and `current` itself when nothing does — mirroring
// immer, which skips same-value assignments, so untouched state keeps its
// reference and downstream caches stay warm. Nest calls to replace along a
// path: `s.a = patched(s.a, { b: patched(s.a.b, { c: 1 }) })`.

export function patched<T extends object>(current: T, patch: Partial<T>): T {
  for (const key in patch) {
    if (!Object.is(current[key], patch[key])) {
      return { ...current, ...patch };
    }
  }
  return current;
}
