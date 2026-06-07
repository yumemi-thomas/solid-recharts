// Ported from recharts 3.8.1 src/util/createEventProxy.ts (commit 7a23854).
// Solid deviation: no React `persist()` — capture `currentTarget` on a Proxy so
// async/throttled handlers can read it after the original event loop turn.
export function createEventProxy<E extends { currentTarget: unknown }>(event: E): E {
  const { currentTarget } = event;
  return new Proxy(event, {
    get(target, prop) {
      if (prop === "currentTarget") {
        return currentTarget;
      }
      const value = Reflect.get(target, prop);
      if (typeof value === "function") {
        return value.bind(target);
      }
      return value;
    },
  });
}
