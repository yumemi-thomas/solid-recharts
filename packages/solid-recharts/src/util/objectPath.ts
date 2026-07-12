// Replaces es-toolkit/compat `get` — the deep-dataKey path engine behind
// getValueByDataKey (`"nested.obj.children"`, `"arr[1].y"`, numeric keys, …).
// Faithful port of es-toolkit's get/toPath/toKey/isDeepKey/isUnsafeProperty
// (MIT), restricted to the string|number paths recharts dataKeys use and
// adapted to this repo's type discipline (unknown + narrowing, no assertions).

const isIndexable = (value: unknown): value is Record<PropertyKey, unknown> =>
  (typeof value === "object" && value !== null) || typeof value === "function";

const readKey = (object: unknown, key: string): unknown =>
  isIndexable(object) ? object[key] : undefined;

/** lodash `toKey` for numbers: `-0` stringifies to `"-0"`, not `"0"`. */
const numberToKey = (value: number): string => (Object.is(value, -0) ? "-0" : String(value));

const isDeepKey = (key: string): boolean =>
  key.includes(".") || key.includes("[") || key.includes("]");

/**
 * lodash-style path tokenizer: `"a.b[0]['c.d']"` → `["a", "b", "0", "c.d"]`.
 * Handles quoted bracket keys, backslash escapes inside quotes, and a leading
 * dot (which yields a leading empty segment, matching lodash).
 */
export function toPath(deepKey: string): string[] {
  const result: string[] = [];
  const length = deepKey.length;
  if (length === 0) {
    return result;
  }
  let index = 0;
  let key = "";
  let quoteChar = "";
  let bracket = false;
  if (deepKey.charCodeAt(0) === 46) {
    result.push("");
    index++;
  }
  while (index < length) {
    const char = deepKey[index];
    if (quoteChar) {
      if (char === "\\" && index + 1 < length) {
        index++;
        key += deepKey[index];
      } else if (char === quoteChar) {
        quoteChar = "";
      } else {
        key += char;
      }
    } else if (bracket) {
      if (char === '"' || char === "'") {
        quoteChar = char;
      } else if (char === "]") {
        bracket = false;
        result.push(key);
        key = "";
      } else {
        key += char;
      }
    } else if (char === "[") {
      bracket = true;
      if (key) {
        result.push(key);
        key = "";
      }
    } else if (char === ".") {
      if (key) {
        result.push(key);
        key = "";
      }
    } else {
      key += char;
    }
    index++;
  }
  if (key) {
    result.push(key);
  }
  return result;
}

function getWithPath(object: unknown, path: readonly string[], defaultValue: unknown): unknown {
  if (path.length === 0) {
    return defaultValue;
  }
  let current: unknown = object;
  for (let index = 0; index < path.length; index++) {
    if (current == null) {
      return defaultValue;
    }
    const segment = path[index];
    if (segment === undefined || segment === "__proto__") {
      return defaultValue;
    }
    current = readKey(current, segment);
  }
  return current === undefined ? defaultValue : current;
}

/**
 * Resolves `path` against `object` — a direct own key wins over path syntax
 * (so a literal `"a.b"` key is found before `"a.b"` is treated as a deep
 * path), exactly like lodash/es-toolkit `get`.
 *
 * The generic overload is a DECLARED-UNSOUND seam (same boundary es-toolkit's
 * `any`-typed `get` provided): a runtime string path can't prove its value's
 * type, so the caller's expected type is taken on faith. The implementation
 * works in honest `unknown`.
 */
export function get<T>(object: unknown, path: string | number, defaultValue?: T): T | undefined;
export function get(object: unknown, path: string | number, defaultValue?: unknown): unknown {
  if (object == null) {
    return defaultValue;
  }
  if (typeof path === "number") {
    const result = readKey(object, numberToKey(path));
    return result === undefined ? defaultValue : result;
  }
  if (path === "__proto__") {
    return defaultValue;
  }
  const direct = readKey(object, path);
  if (direct !== undefined) {
    return direct;
  }
  if (isDeepKey(path)) {
    return getWithPath(object, toPath(path), defaultValue);
  }
  return defaultValue;
}
