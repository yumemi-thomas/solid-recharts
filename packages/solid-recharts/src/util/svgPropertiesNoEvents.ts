// Ported from recharts 3.8.1 (allowlist is framework-agnostic data).
// recharts uses Record<PropertyKey, any> + an `as` cast; here: unknown + allowlist Set + Partial<T> return (no assertions).
export const SVGElementPropKeys = [
  "aria-activedescendant",
  "aria-atomic",
  "aria-autocomplete",
  "aria-busy",
  "aria-checked",
  "aria-colcount",
  "aria-colindex",
  "aria-colspan",
  "aria-controls",
  "aria-current",
  "aria-describedby",
  "aria-details",
  "aria-disabled",
  "aria-errormessage",
  "aria-expanded",
  "aria-flowto",
  "aria-haspopup",
  "aria-hidden",
  "aria-invalid",
  "aria-keyshortcuts",
  "aria-label",
  "aria-labelledby",
  "aria-level",
  "aria-live",
  "aria-modal",
  "aria-multiline",
  "aria-multiselectable",
  "aria-orientation",
  "aria-owns",
  "aria-placeholder",
  "aria-posinset",
  "aria-pressed",
  "aria-readonly",
  "aria-relevant",
  "aria-required",
  "aria-roledescription",
  "aria-rowcount",
  "aria-rowindex",
  "aria-rowspan",
  "aria-selected",
  "aria-setsize",
  "aria-sort",
  "aria-valuemax",
  "aria-valuemin",
  "aria-valuenow",
  "aria-valuetext",
  "className",
  "color",
  "height",
  "id",
  "lang",
  "max",
  "media",
  "method",
  "min",
  "name",
  "style",
  // 'type' is intentionally omitted: it conflicts with the recharts `type` prop and no
  // SVG element we use needs it (recharts PR #3327).
  "target",
  "width",
  "role",
  "tabIndex",
  "accentHeight",
  "accumulate",
  "additive",
  "alignmentBaseline",
  "allowReorder",
  "alphabetic",
  "amplitude",
  "arabicForm",
  "ascent",
  "attributeName",
  "attributeType",
  "autoReverse",
  "azimuth",
  "baseFrequency",
  "baselineShift",
  "baseProfile",
  "bbox",
  "begin",
  "bias",
  "by",
  "calcMode",
  "capHeight",
  "clip",
  "clipPath",
  "clipPathUnits",
  "clipRule",
  "colorInterpolation",
  "colorInterpolationFilters",
  "colorProfile",
  "colorRendering",
  "contentScriptType",
  "contentStyleType",
  "cursor",
  "cx",
  "cy",
  "d",
  "decelerate",
  "descent",
  "diffuseConstant",
  "direction",
  "display",
  "divisor",
  "dominantBaseline",
  "dur",
  "dx",
  "dy",
  "edgeMode",
  "elevation",
  "enableBackground",
  "end",
  "exponent",
  "externalResourcesRequired",
  "fill",
  "fillOpacity",
  "fillRule",
  "filter",
  "filterRes",
  "filterUnits",
  "floodColor",
  "floodOpacity",
  "focusable",
  "fontFamily",
  "fontSize",
  "fontSizeAdjust",
  "fontStretch",
  "fontStyle",
  "fontVariant",
  "fontWeight",
  "format",
  "from",
  "fx",
  "fy",
  "g1",
  "g2",
  "glyphName",
  "glyphOrientationHorizontal",
  "glyphOrientationVertical",
  "glyphRef",
  "gradientTransform",
  "gradientUnits",
  "hanging",
  "horizAdvX",
  "horizOriginX",
  "href",
  "ideographic",
  "imageRendering",
  "in2",
  "in",
  "intercept",
  "k1",
  "k2",
  "k3",
  "k4",
  "k",
  "kernelMatrix",
  "kernelUnitLength",
  "kerning",
  "keyPoints",
  "keySplines",
  "keyTimes",
  "lengthAdjust",
  "letterSpacing",
  "lightingColor",
  "limitingConeAngle",
  "local",
  "markerEnd",
  "markerHeight",
  "markerMid",
  "markerStart",
  "markerUnits",
  "markerWidth",
  "mask",
  "maskContentUnits",
  "maskUnits",
  "mathematical",
  "mode",
  "numOctaves",
  "offset",
  "opacity",
  "operator",
  "order",
  "orient",
  "orientation",
  "origin",
  "overflow",
  "overlinePosition",
  "overlineThickness",
  "paintOrder",
  "panose1",
  "pathLength",
  "patternContentUnits",
  "patternTransform",
  "patternUnits",
  "pointerEvents",
  "pointsAtX",
  "pointsAtY",
  "pointsAtZ",
  "preserveAlpha",
  "preserveAspectRatio",
  "primitiveUnits",
  "r",
  "radius",
  "refX",
  "refY",
  "renderingIntent",
  "repeatCount",
  "repeatDur",
  "requiredExtensions",
  "requiredFeatures",
  "restart",
  "result",
  "rotate",
  "rx",
  "ry",
  "seed",
  "shapeRendering",
  "slope",
  "spacing",
  "specularConstant",
  "specularExponent",
  "speed",
  "spreadMethod",
  "startOffset",
  "stdDeviation",
  "stemh",
  "stemv",
  "stitchTiles",
  "stopColor",
  "stopOpacity",
  "strikethroughPosition",
  "strikethroughThickness",
  "string",
  "stroke",
  "strokeDasharray",
  "strokeDashoffset",
  "strokeLinecap",
  "strokeLinejoin",
  "strokeMiterlimit",
  "strokeOpacity",
  "strokeWidth",
  "surfaceScale",
  "systemLanguage",
  "tableValues",
  "targetX",
  "targetY",
  "textAnchor",
  "textDecoration",
  "textLength",
  "textRendering",
  "to",
  "transform",
  "u1",
  "u2",
  "underlinePosition",
  "underlineThickness",
  "unicode",
  "unicodeBidi",
  "unicodeRange",
  "unitsPerEm",
  "vAlphabetic",
  "values",
  "vectorEffect",
  "version",
  "vertAdvY",
  "vertOriginX",
  "vertOriginY",
  "vHanging",
  "vIdeographic",
  "viewTarget",
  "visibility",
  "vMathematical",
  "widths",
  "wordSpacing",
  "writingMode",
  "x1",
  "x2",
  "x",
  "xChannelSelector",
  "xHeight",
  "xlinkActuate",
  "xlinkArcrole",
  "xlinkHref",
  "xlinkRole",
  "xlinkShow",
  "xlinkTitle",
  "xlinkType",
  "xmlBase",
  "xmlLang",
  "xmlns",
  "xmlnsXlink",
  "xmlSpace",
  "y1",
  "y2",
  "y",
  "yChannelSelector",
  "z",
  "zoomAndPan",
  "ref",
  "key",
  "angle",
] as const;

export type SVGElementPropKeysType = (typeof SVGElementPropKeys)[number];
export type DataAttributeKeyType = `data-${string}`;

export function isDataAttribute(key: string): key is DataAttributeKeyType {
  return key.startsWith("data-");
}

// recharts (like React) names SVG props in camelCase; the REAL SVG attribute name
// for the hyphenated presentation/font/xlink attributes differs. Solid spreads keys
// verbatim — it does NOT camelCase→kebab convert — so `strokeWidth` would emit an
// invalid `strokeWidth` attribute the browser ignores instead of `stroke-width`.
// This map renames just those keys on the way out. Genuinely-camelCase SVG
// attributes (viewBox, gradientTransform, attributeName, clipPathUnits, …) are
// intentionally ABSENT here and pass through unchanged.
export const SVG_ATTRIBUTE_RENAMES = {
  className: "class",
  tabIndex: "tabindex",
  accentHeight: "accent-height",
  alignmentBaseline: "alignment-baseline",
  arabicForm: "arabic-form",
  baselineShift: "baseline-shift",
  capHeight: "cap-height",
  clipPath: "clip-path",
  clipRule: "clip-rule",
  colorInterpolation: "color-interpolation",
  colorInterpolationFilters: "color-interpolation-filters",
  colorProfile: "color-profile",
  colorRendering: "color-rendering",
  dominantBaseline: "dominant-baseline",
  enableBackground: "enable-background",
  fillOpacity: "fill-opacity",
  fillRule: "fill-rule",
  floodColor: "flood-color",
  floodOpacity: "flood-opacity",
  fontFamily: "font-family",
  fontSize: "font-size",
  fontSizeAdjust: "font-size-adjust",
  fontStretch: "font-stretch",
  fontStyle: "font-style",
  fontVariant: "font-variant",
  fontWeight: "font-weight",
  glyphName: "glyph-name",
  glyphOrientationHorizontal: "glyph-orientation-horizontal",
  glyphOrientationVertical: "glyph-orientation-vertical",
  horizAdvX: "horiz-adv-x",
  horizOriginX: "horiz-origin-x",
  imageRendering: "image-rendering",
  letterSpacing: "letter-spacing",
  lightingColor: "lighting-color",
  markerEnd: "marker-end",
  markerMid: "marker-mid",
  markerStart: "marker-start",
  overlinePosition: "overline-position",
  overlineThickness: "overline-thickness",
  paintOrder: "paint-order",
  panose1: "panose-1",
  pointerEvents: "pointer-events",
  renderingIntent: "rendering-intent",
  shapeRendering: "shape-rendering",
  stopColor: "stop-color",
  stopOpacity: "stop-opacity",
  strikethroughPosition: "strikethrough-position",
  strikethroughThickness: "strikethrough-thickness",
  strokeDasharray: "stroke-dasharray",
  strokeDashoffset: "stroke-dashoffset",
  strokeLinecap: "stroke-linecap",
  strokeLinejoin: "stroke-linejoin",
  strokeMiterlimit: "stroke-miterlimit",
  strokeOpacity: "stroke-opacity",
  strokeWidth: "stroke-width",
  textAnchor: "text-anchor",
  textDecoration: "text-decoration",
  textRendering: "text-rendering",
  underlinePosition: "underline-position",
  underlineThickness: "underline-thickness",
  unicodeBidi: "unicode-bidi",
  unicodeRange: "unicode-range",
  unitsPerEm: "units-per-em",
  vAlphabetic: "v-alphabetic",
  vHanging: "v-hanging",
  vIdeographic: "v-ideographic",
  vMathematical: "v-mathematical",
  vectorEffect: "vector-effect",
  vertAdvY: "vert-adv-y",
  vertOriginX: "vert-origin-x",
  vertOriginY: "vert-origin-y",
  wordSpacing: "word-spacing",
  writingMode: "writing-mode",
  xHeight: "x-height",
  xlinkActuate: "xlink:actuate",
  xlinkArcrole: "xlink:arcrole",
  xlinkHref: "xlink:href",
  xlinkRole: "xlink:role",
  xlinkShow: "xlink:show",
  xlinkTitle: "xlink:title",
  xlinkType: "xlink:type",
  xmlBase: "xml:base",
  xmlLang: "xml:lang",
} as const satisfies Readonly<Record<string, string>>;

// Widened view for string-keyed lookup (the literal type above has no index signature).
const SVG_ATTRIBUTE_RENAMES_LOOKUP: Readonly<Record<string, string>> = SVG_ATTRIBUTE_RENAMES;

/** The camelCase prop names that rename to a different DOM attribute name. */
type SvgCamelRenameKey = keyof typeof SVG_ATTRIBUTE_RENAMES;
/** The kebab/namespaced DOM attribute names produced by the rename map. */
export type SvgKebabRenameTarget = (typeof SVG_ATTRIBUTE_RENAMES)[SvgCamelRenameKey];

/**
 * SINGLE-CONVENTION PUBLIC SURFACE: every SVG passthrough prop has exactly ONE
 * accepted spelling — the recharts camelCase name (`strokeWidth`), matching
 * recharts' `filterProps`. The kebab DOM spellings (`stroke-width`) are NOT
 * accepted as component props; they exist only on the rendered DOM output.
 *
 * `CamelSvgAttributes` is the camel vocabulary (minus `className` — this port's
 * components own `class`); `CamelSvgProps<Base>` grafts it onto a Solid
 * `JSX.*SVGAttributes` base while stripping the kebab duplicates (keeping
 * Solid-native `class`, which the rename map targets but components re-own).
 */
export type CamelSvgAttributes = {
  [K in Exclude<SvgCamelRenameKey, "className">]?: string | number;
};
export type CamelSvgProps<Base> = Omit<Base, Exclude<SvgKebabRenameTarget, "class">> &
  CamelSvgAttributes;

/** The DOM attribute name for a (possibly camelCase) SVG prop key. */
export function toSvgAttributeName(key: string): string {
  return SVG_ATTRIBUTE_RENAMES_LOOKUP[key] ?? key;
}

// Recognize ONLY the camelCase allowlist keys (single convention — recharts
// `filterProps` parity). Kebab DOM names are an OUTPUT format (see
// toSvgAttributeName), never an input convention; `aria-*` entries in the
// allowlist are canonically kebab in recharts and Solid alike and stay as-is.
const SVG_KEY_SET: ReadonlySet<string> = new Set(SVGElementPropKeys);

export function isSvgElementPropKey(key: string): boolean {
  return SVG_KEY_SET.has(key);
}

// Returns a DOM-ready attribute record (kebab/namespaced names) — NOT keyed by the
// camelCase input keys, hence `Record<string, unknown>` rather than `Partial<T>`.
export function svgPropertiesNoEvents(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key in obj) {
    if (
      Object.prototype.hasOwnProperty.call(obj, key) &&
      (isSvgElementPropKey(key) || isDataAttribute(key))
    ) {
      result[toSvgAttributeName(key)] = obj[key];
    }
  }
  return result;
}

/**
 * Vendor-verbatim variant of {@link svgPropertiesNoEvents}: same allowlist
 * filter, but KEEPS the camelCase key names (recharts' filterProps returns
 * camel keys — React renders them; only OUR raw-DOM spreads need the rename).
 * Use when BUILDING a component-input/payload record (props fed to <Dot> /
 * <Rectangle> or handed to `shape`/`activeDot` render functions): the camel
 * keys are the public vocabulary, and the consuming component applies the
 * DOM rename itself.
 */
export function svgPropertiesNoEventsKeepCase(
  obj: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key in obj) {
    if (
      Object.prototype.hasOwnProperty.call(obj, key) &&
      (isSvgElementPropKey(key) || isDataAttribute(key))
    ) {
      result[key] = obj[key];
    }
  }
  return result;
}

/** Keep-case twin of {@link svgPropertiesNoEventsFromUnknown}. */
export function svgPropertiesNoEventsFromUnknownKeepCase(
  input: unknown,
): Record<string, unknown> | null {
  if (input == null) {
    return null;
  }
  if (typeof input === "object" && !Array.isArray(input)) {
    return svgPropertiesNoEventsKeepCase({ ...input });
  }
  return null;
}

/**
 * Loosely-typed variant: filters SVG props out of an `unknown` input. Returns the
 * filtered props for a plain (non-array) object, and `null` for everything else.
 *
 * DEVIATION from recharts: recharts also accepts a React element here (via
 * `isValidElement` + `element.props`) so callers can pass `dot={<circle .../>}`.
 * Solid has no element-props introspection — a rendered Solid element is a DOM
 * node, not a `{ props }` data structure — so the element branch is deferred
 * until the Tier-2 "shape can be an element or a props object" pattern is
 * designed (ActiveShapeUtils). Element inputs currently fall through to `null`.
 */
export function svgPropertiesNoEventsFromUnknown(input: unknown): Record<string, unknown> | null {
  if (input == null) {
    return null;
  }
  if (typeof input === "object" && !Array.isArray(input)) {
    return svgPropertiesNoEvents({ ...input });
  }
  return null;
}
