// Ported from recharts 3.8.1 src/state/selectors/combiners/combineCoordinateForDefaultIndex.ts.
import { ChartOffsetInternal, Coordinate, LayoutType, TickItem } from "../../../util/types";
import { TooltipIndex, TooltipPayloadConfiguration } from "../../tooltipSlice";

export const combineCoordinateForDefaultIndex = (
  width: number,
  height: number,
  layout: LayoutType,
  offset: ChartOffsetInternal,
  tooltipTicks: ReadonlyArray<TickItem> | undefined,
  defaultIndex: TooltipIndex | undefined,
  tooltipConfigurations: ReadonlyArray<TooltipPayloadConfiguration>,
): Coordinate | undefined => {
  if (defaultIndex == null) {
    return undefined;
  }
  // With defaultIndex alone we can't decide which of multiple tooltips to show,
  // so we choose the first configuration.
  const firstConfiguration = tooltipConfigurations[0];
  const maybePosition: Coordinate | undefined = firstConfiguration?.getPosition(defaultIndex);
  if (maybePosition != null) {
    return maybePosition;
  }
  const tick = tooltipTicks?.[Number(defaultIndex)];
  if (!tick) {
    return undefined;
  }
  switch (layout) {
    case "horizontal": {
      return {
        x: tick.coordinate,
        y: (offset.top + height) / 2,
      };
    }
    default: {
      // Conflates vertical/radial/centric layouts — same TODO as recharts.
      return {
        x: (offset.left + width) / 2,
        y: tick.coordinate,
      };
    }
  }
};
