// Ported from recharts 3.8.1
// src/state/selectors/combiners/combineInverseScaleFunction.ts (commit 7a23854).
import { InverseScaleFunction } from "../../../hooks";
import { createCategoricalInverse } from "../../../util/scale/createCategoricalInverse";
import { CustomScaleDefinition } from "../../../util/scale/CustomScaleDefinition";

export function combineInverseScaleFunction(
  configuredScale: CustomScaleDefinition | undefined,
): InverseScaleFunction | undefined {
  if (configuredScale == null) {
    return undefined;
  }
  if ("invert" in configuredScale && typeof configuredScale.invert === "function") {
    return configuredScale.invert.bind(configuredScale);
  }
  return createCategoricalInverse(configuredScale, undefined);
}
