// Assertion function (runtime-checked narrowing — a guard, not an `as` cast).
export function assertNotNull<T>(value: T | null | undefined): asserts value is T {
  if (value == null) {
    throw new Error("Expected value to not be null or undefined");
  }
}
