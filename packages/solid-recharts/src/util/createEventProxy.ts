// Ported from recharts 3.8.1 src/util/createEventProxy.ts (commit 7a23854).
// Solid deviation: no React `persist()` — capture `currentTarget` on a Proxy so
// async/throttled handlers can read it after the original event loop turn.
// Narrows an unknown to a callable type (not the lib `Function`, whose `.bind`/`.apply`
// return `any`) so a forwarded method stays typed without a cast.
function isCallable(value: unknown): value is (...args: unknown[]) => unknown {
  return typeof value === "function";
}

export function createEventProxy<E extends { currentTarget: unknown }>(event: E): E {
  const { currentTarget } = event;
  return new Proxy(event, {
    get(target, prop) {
      if (prop === "currentTarget") {
        return currentTarget;
      }
      const value: unknown = Reflect.get(target, prop);
      if (isCallable(value)) {
        return value.bind(target);
      }
      return value;
    },
  });
}
