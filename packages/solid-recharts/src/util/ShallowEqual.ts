// Reimplements react-redux's `shallowEqual` (react-redux/src/utils/shallowEqual.ts).
// The reference test imports `shallowEqual` from 'react-redux'; this project has no
// react-redux, so we provide a local equivalent: Object.is reference/NaN handling,
// then own-enumerable-key comparison in both directions with Object.is per key.

function is(x: unknown, y: unknown): boolean {
  if (x === y) {
    return x !== 0 || y !== 0 || 1 / x === 1 / y;
  }
  return x !== x && y !== y;
}

export function shallowEqual(objA: unknown, objB: unknown): boolean {
  if (is(objA, objB)) {
    return true;
  }

  if (typeof objA !== "object" || objA === null || typeof objB !== "object" || objB === null) {
    return false;
  }

  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);

  if (keysA.length !== keysB.length) {
    return false;
  }

  for (let i = 0; i < keysA.length; i++) {
    const key = keysA[i];
    if (key === undefined) {
      continue;
    }
    if (
      !Object.prototype.hasOwnProperty.call(objB, key) ||
      !is(Reflect.get(objA, key), Reflect.get(objB, key))
    ) {
      return false;
    }
  }

  return true;
}
