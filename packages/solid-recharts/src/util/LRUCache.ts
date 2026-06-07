// Ported from recharts 3.8.1 src/util/LRUCache.ts (commit 7a23854).
// Pure data structure — no framework surface — so behavior is byte-identical to recharts.
// Deviations from the reference are limited to satisfying this repo's type
// discipline (no `as` / no non-null `!`); `as const` is retained where applicable.

/**
 * Simple LRU (Least Recently Used) cache implementation
 */
export class LRUCache<K, V> {
  private cache = new Map<K, V>();

  private maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey != null) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}
