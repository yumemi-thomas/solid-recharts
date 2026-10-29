// Ported from recharts 3.8.1 src/util/DOMUtils.ts (commit 7a23854).
//
// Deviation: React's `CSSProperties` (camelCase, e.g. `fontSize`) → Solid's
// `JSX.CSSProperties` (kebab-case, e.g. `"font-size"`, values as strings with units),
// the same convention as every `style` prop in Solid. The style is applied to the
// measurement span with `setProperty`, which takes the kebab-case names directly.
// Everything else (DOM measurement span, LRUCache, Global SSR guard) is
// framework-agnostic.
import type { JSX } from "@solidjs/web";
import { Global } from "./Global";
import { Size } from "./types";
import { LRUCache } from "./LRUCache";

export interface TextMeasurementConfig {
  /** Maximum number of items to cache */
  cacheSize: number;
  /** Whether to enable caching */
  enableCache: boolean;
}

const defaultConfig: TextMeasurementConfig = {
  cacheSize: 2000,
  enableCache: true,
};

let currentConfig = { ...defaultConfig };

let stringCache = new LRUCache<string, Size>(currentConfig.cacheSize);
type CSSProperties = JSX.CSSProperties;

const SPAN_STYLE: CSSProperties = {
  position: "absolute",
  top: "-20000px",
  left: "0",
  padding: "0",
  margin: "0",
  border: "none",
  "white-space": "pre",
};
const MEASUREMENT_SPAN_ID = "recharts_measurement_span";

function createCacheKey(text: string | number, style: CSSProperties): string {
  // Simple string concatenation for better performance than JSON.stringify
  const fontSize = style["font-size"] || "";
  const fontFamily = style["font-family"] || "";
  const fontWeight = style["font-weight"] || "";
  const fontStyle = style["font-style"] || "";
  const letterSpacing = style["letter-spacing"] || "";
  const textTransform = style["text-transform"] || "";

  return `${text}|${fontSize}|${fontFamily}|${fontWeight}|${fontStyle}|${letterSpacing}|${textTransform}`;
}

function applyStyle(target: CSSStyleDeclaration, style: CSSProperties): void {
  for (const [property, value] of Object.entries(style)) {
    if (typeof value === "string" || typeof value === "number") {
      target.setProperty(property, String(value));
    }
  }
}

/**
 * Measure text using DOM (accurate but slower)
 * @param text - The text to measure
 * @param style - CSS style properties to apply
 * @returns The size of the text
 */
const measureTextWithDOM = (text: string | number, style: CSSProperties): Size => {
  try {
    let measurementSpan = document.getElementById(MEASUREMENT_SPAN_ID);
    if (!measurementSpan) {
      measurementSpan = document.createElement("span");
      measurementSpan.setAttribute("id", MEASUREMENT_SPAN_ID);
      measurementSpan.setAttribute("aria-hidden", "true");
      document.body.appendChild(measurementSpan);
    }

    // The span is reused, so a property that an earlier call set and this one omits stays
    // (as in recharts, whose `Object.assign` behaves the same).
    applyStyle(measurementSpan.style, SPAN_STYLE);
    applyStyle(measurementSpan.style, style);
    measurementSpan.textContent = `${text}`;

    const rect = measurementSpan.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  } catch {
    return { width: 0, height: 0 };
  }
};

export const getStringSize = (text: string | number, style: CSSProperties = {}): Size => {
  if (text === undefined || text === null || Global.isSsr) {
    return { width: 0, height: 0 };
  }

  // If caching is disabled, measure directly
  if (!currentConfig.enableCache) {
    return measureTextWithDOM(text, style);
  }

  const cacheKey = createCacheKey(text, style);
  const cachedResult = stringCache.get(cacheKey);

  if (cachedResult) {
    return cachedResult;
  }

  // Measure using DOM
  const result = measureTextWithDOM(text, style);

  // Store in LRU cache
  stringCache.set(cacheKey, result);

  return result;
};

/**
 * Configure text measurement behavior
 * @param config - Partial configuration to apply
 * @returns void
 */
export const configureTextMeasurement = (config: Partial<TextMeasurementConfig>): void => {
  const newConfig = { ...currentConfig, ...config };

  if (newConfig.cacheSize !== currentConfig.cacheSize) {
    stringCache = new LRUCache<string, Size>(newConfig.cacheSize);
  }

  currentConfig = newConfig;
};

/**
 * Get current text measurement configuration
 * @returns Current configuration
 */
export const getTextMeasurementConfig = (): TextMeasurementConfig => ({ ...currentConfig });

/**
 * Clear the string size cache. Useful for testing or memory management.
 * @returns void
 */
export const clearStringCache = (): void => {
  stringCache.clear();
};

/**
 * Get cache statistics for debugging purposes.
 * @returns Cache statistics including size and max size
 */
export const getStringCacheStats = () => ({
  size: stringCache.size(),
  maxSize: currentConfig.cacheSize,
});
