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
//
// "Differs" is by value for plain objects (a tooltip `coordinate`, a freshly built
// interaction node): the pointer handlers build them anew on every event, so an
// event that lands on the same data point would otherwise replace the node — and
// re-run every reader of it — for a state that did not change. A field that is
// value-equal to the current one keeps the current reference.

const MAX_DEPTH = 3;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const proto: unknown = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function valuesEqual(left: unknown, right: unknown, depth: number): boolean {
  if (Object.is(left, right)) {
    return true;
  }
  if (depth >= MAX_DEPTH || !isPlainObject(left) || !isPlainObject(right)) {
    return false;
  }
  const leftKeys = Object.keys(left);
  if (leftKeys.length !== Object.keys(right).length) {
    return false;
  }
  return leftKeys.every(
    (key) => Object.hasOwn(right, key) && valuesEqual(left[key], right[key], depth + 1),
  );
}

export function patched<T extends object>(current: T, patch: Partial<T>): T {
  let changed = false;
  const kept: Partial<T> = {};
  for (const key in patch) {
    if (valuesEqual(current[key], patch[key], 0)) {
      kept[key] = current[key];
    } else {
      changed = true;
    }
  }
  return changed ? { ...current, ...patch, ...kept } : current;
}
