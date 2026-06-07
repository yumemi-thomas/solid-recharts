// Ported from recharts 3.8.1 src/state/types/RadarSettings.ts (commit 7a23854).
import { BasePolarGraphicalItemSettings } from "../graphicalItemsSlice";

export interface RadarSettings extends BasePolarGraphicalItemSettings {
  type: "radar";
}
