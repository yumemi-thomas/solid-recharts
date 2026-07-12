// Ported from recharts 3.8.1 src/synchronisation/useChartSynchronisation.tsx
// (commit 7a23854) to Solid 2.0.
//
// recharts wires three React `useEffect`s onto the mitt `eventCenter`:
//   - emit a TOOLTIP_SYNC_EVENT whenever the local active tooltip changes,
//   - listen for TOOLTIP_SYNC_EVENTs from OTHER charts and project them onto this
//     chart's axes per `syncMethod`,
//   - the same pair for brush start/end indexes.
// The Solid port keeps the exact same semantics but over `syncEventCenter`
// (`syncRegistry.ts`, a plain synchronous bus) and Solid `createEffect`s.
//
// Reactivity notes (diagnostics-clean):
//  - Each effect uses the two-arg `createEffect(deps, effect)` form: the first
//    function tracks the reactive inputs and returns them as a tuple, the second
//    runs the side effect (subscribe/emit). Reads inside the side-effect callback
//    are therefore not tracked, and we never write a *local* signal there — emits
//    only call OTHER charts' batched store setters via the registry, which is the
//    sanctioned cross-store write path (no SIGNAL_WRITE_IN_OWNED_SCOPE).
//  - The listener calls `store.actions.tooltip.setSyncInteraction(...)` +
//    `flush()` on the RECEIVING chart's store; that store is a different owner, so
//    the write is not "in an owned computation" of the emitting effect.
import { createEffect, flush, untrack } from "solid-js";
import { useAppStore } from "../state/hooks";
import {
  selectEventEmitter,
  selectSyncId,
  selectSyncMethod,
} from "../state/selectors/rootPropsSelectors";
import {
  selectActiveTooltipGraphicalItemId,
  selectTooltipAxisTicks,
  selectTooltipDataKey,
} from "../state/selectors/tooltipSelectors";
import { selectChartLayout, useViewBox } from "../context/chartLayoutContext";
import { Coordinate, TickItem, TooltipEventType } from "../util/types";
import { TooltipTrigger } from "../chart/types";
import { TooltipIndex, TooltipSyncState } from "../state/tooltipSlice";
import { ActiveLabel, MouseHandlerDataParam } from "./types";
import { BrushStartEndIndex } from "../context/brushUpdateContext";
import { BRUSH_SYNC_EVENT, SyncId, TOOLTIP_SYNC_EVENT, syncEventCenter } from "./syncRegistry";
import type { RechartsStore } from "../state/store";

const inactiveSyncState: TooltipSyncState = {
  active: false,
  coordinate: undefined,
  dataKey: undefined,
  index: null,
  label: undefined,
  sourceViewBox: undefined,
  graphicalItemId: undefined,
};

/**
 * Listens for tooltip sync events from other charts and writes the appropriate
 * sync interaction state based on this chart's `syncMethod`. Mirrors recharts'
 * `useTooltipSyncEventsListener` 1:1.
 */
function useTooltipSyncEventsListener(store: RechartsStore): void {
  const viewBox = useViewBox();

  createEffect(
    () => {
      const mySyncId = selectSyncId(store.state);
      const myEventEmitter = selectEventEmitter(store.state);
      const syncMethod = selectSyncMethod(store.state);
      const tooltipTicks = selectTooltipAxisTicks(store.state);
      const layout = selectChartLayout(store.state);
      const box = viewBox();
      return { mySyncId, myEventEmitter, syncMethod, tooltipTicks, layout, box };
    },
    ({ mySyncId, myEventEmitter, syncMethod, tooltipTicks, layout, box }) => {
      if (mySyncId == null) {
        // Not synchronised with any other chart — nothing to listen for.
        return;
      }

      const listener = (
        incomingSyncId: SyncId,
        payload: TooltipSyncState,
        emitter: symbol,
      ): void => {
        if (myEventEmitter === emitter) {
          // Don't react to our own emissions.
          return;
        }
        if (mySyncId !== incomingSyncId) {
          // Not for this chart.
          return;
        }

        // Source deactivation (mouseLeave) clears state for ALL sync methods,
        // including sourceViewBox so emission can resume.
        if (payload.active === false) {
          store.actions.tooltip.setSyncInteraction(inactiveSyncState);
          flush();
          return;
        }

        if (syncMethod === "index") {
          if (box && payload.coordinate && payload.sourceViewBox) {
            const { coordinate } = payload;
            const { x, y } = coordinate;
            const {
              x: sourceX,
              y: sourceY,
              width: sourceWidth,
              height: sourceHeight,
            } = payload.sourceViewBox;
            const scaledCoordinate: Coordinate = {
              ...coordinate,
              x: box.x + (sourceWidth ? (x - sourceX) / sourceWidth : 0) * box.width,
              y: box.y + (sourceHeight ? (y - sourceY) / sourceHeight : 0) * box.height,
            };
            store.actions.tooltip.setSyncInteraction({
              ...payload,
              coordinate: scaledCoordinate,
            });
          } else {
            store.actions.tooltip.setSyncInteraction(payload);
          }
          flush();
          return;
        }

        if (tooltipTicks == null) {
          // 'value'/function need ticks.
          return;
        }

        let activeTick: TickItem | undefined;
        if (typeof syncMethod === "function") {
          const syncMethodParam: MouseHandlerDataParam = {
            activeTooltipIndex: payload.index == null ? undefined : Number(payload.index),
            isTooltipActive: payload.active,
            activeIndex: payload.index == null ? undefined : Number(payload.index),
            activeLabel: payload.label,
            activeDataKey: payload.dataKey,
            activeCoordinate: payload.coordinate,
          };
          const activeTooltipIndex = syncMethod(tooltipTicks, syncMethodParam);
          activeTick = tooltipTicks[activeTooltipIndex];
        } else if (syncMethod === "value") {
          activeTick = tooltipTicks.find((tick) => String(tick.value) === payload.label);
        }

        const { coordinate } = payload;
        if (coordinate == null || box == null) {
          store.actions.tooltip.setSyncInteraction(inactiveSyncState);
          flush();
          return;
        }

        if (activeTick == null) {
          // No matching tick (sparse data): hide locally but KEEP sourceViewBox so
          // the emission guard still sees us as "receiving" (no counter-cascade).
          store.actions.tooltip.setSyncInteraction({
            ...inactiveSyncState,
            sourceViewBox: payload.sourceViewBox,
          });
          flush();
          return;
        }

        const validateChartX = Math.min(coordinate.x, box.x + box.width);
        const validateChartY = Math.min(coordinate.y, box.y + box.height);
        const activeCoordinate: Coordinate = {
          x: layout === "horizontal" ? activeTick.coordinate : validateChartX,
          y: layout === "horizontal" ? validateChartY : activeTick.coordinate,
        };

        store.actions.tooltip.setSyncInteraction({
          active: payload.active,
          coordinate: activeCoordinate,
          dataKey: payload.dataKey,
          index: String(activeTick.index),
          label: payload.label,
          sourceViewBox: payload.sourceViewBox,
          graphicalItemId: payload.graphicalItemId,
        });
        flush();
      };

      syncEventCenter.on(TOOLTIP_SYNC_EVENT, listener);
      // The effect (apply) callback is a leaf scope — return cleanup, don't call
      // onCleanup (which would warn NO_OWNER_CLEANUP). Runs before the next apply.
      return () => {
        syncEventCenter.off(TOOLTIP_SYNC_EVENT, listener);
      };
    },
  );
}

/**
 * Listens for brush sync events from other charts and keeps this chart's data
 * start/end indexes in step. Mirrors recharts' `useBrushSyncEventsListener`.
 */
function useBrushSyncEventsListener(store: RechartsStore): void {
  createEffect(
    () => {
      const mySyncId = selectSyncId(store.state);
      const myEventEmitter = selectEventEmitter(store.state);
      return { mySyncId, myEventEmitter };
    },
    ({ mySyncId, myEventEmitter }) => {
      if (mySyncId == null) {
        return;
      }
      const listener = (
        incomingSyncId: SyncId,
        payload: BrushStartEndIndex,
        emitter: symbol,
      ): void => {
        if (myEventEmitter === emitter) {
          return;
        }
        if (mySyncId === incomingSyncId) {
          store.actions.chartData.setDataStartEndIndexes(payload);
          flush();
        }
      };
      syncEventCenter.on(BRUSH_SYNC_EVENT, listener);
      return () => {
        syncEventCenter.off(BRUSH_SYNC_EVENT, listener);
      };
    },
  );
}

/**
 * Wires this chart up to RECEIVE synchronisation events from other charts.
 * Creates the chart's event-emitter symbol (used to ignore its own emissions)
 * and registers the tooltip + brush listeners. No-op outside a chart.
 */
export function useSynchronisedEventsFromOtherCharts(): void {
  const store = useAppStore();
  if (store == null) {
    return;
  }
  // recharts dispatches `createEventEmitter` from a useEffect; do the same via the
  // two-arg createEffect (the effect callback runs in the effect phase, NOT the
  // owned component scope — a direct setup-time write trips SIGNAL_WRITE_IN_OWNED
  // _SCOPE). Effects flush in creation order, so the symbol is set before the
  // emit effect (created later, in the Tooltip) first runs.
  createEffect(
    () => undefined,
    () => store.actions.options.createEventEmitter(),
  );
  useTooltipSyncEventsListener(store);
  useBrushSyncEventsListener(store);
}

/**
 * EMITS tooltip sync events to other charts when this chart's active tooltip
 * changes. Mirrors recharts' `useTooltipChartSynchronisation`.
 *
 * Emission is suppressed while `isReceivingSynchronisation` (a non-null
 * `sourceViewBox` on the local sync state) to avoid feedback loops / cascading
 * tooltip clears across charts with mismatched data.
 *
 * @param tooltipEventType resolved by the Tooltip
 * @param trigger resolved by the Tooltip
 * @param activeCoordinate from local interaction state
 * @param activeLabel from local interaction state
 * @param activeIndex from local interaction state
 * @param isTooltipActive from local interaction state
 */
export function useTooltipChartSynchronisation(
  tooltipEventType: () => TooltipEventType | undefined,
  trigger: () => TooltipTrigger,
  activeCoordinate: () => Coordinate | undefined,
  activeLabel: () => ActiveLabel,
  activeIndex: () => TooltipIndex | undefined,
  isTooltipActive: () => boolean,
): void {
  const store = useAppStore();
  if (store == null) {
    return;
  }
  const viewBox = useViewBox();

  // recharts dedupes via React's referential effect-dep comparison; its viewBox
  // memo is reference-stable across renders. Here `selectChartViewBox` returns a
  // fresh object each compute, so the effect can re-run with an unchanged payload
  // — guard against emitting an identical sync state twice in a row.
  let lastEmitted: string | undefined;

  createEffect(
    () => {
      // Build the *plain* (snapshotted) payload in the COMPUTE phase, where store
      // reads track and STRICT_READ_UNTRACKED doesn't apply. The apply phase then
      // only emits — it never reads store proxies (which would warn).
      const eventEmitterSymbol = selectEventEmitter(store.state);
      const syncId = selectSyncId(store.state);
      const tooltipState = store.state.tooltip.syncInteraction;
      // sourceViewBox (not `active`) flags that we're currently RECEIVING sync.
      const isReceivingSynchronisation = tooltipState.sourceViewBox != null;

      const box = viewBox();
      const rawCoordinate = activeCoordinate();
      const rawLabel = activeLabel();
      const payload: TooltipSyncState = {
        active: isTooltipActive(),
        coordinate: rawCoordinate == null ? undefined : { ...rawCoordinate },
        dataKey: selectTooltipDataKey(store.state, tooltipEventType(), trigger()),
        index: activeIndex() ?? null,
        label: typeof rawLabel === "number" ? String(rawLabel) : rawLabel,
        sourceViewBox: box == null ? undefined : { ...box },
        graphicalItemId: selectActiveTooltipGraphicalItemId(store.state),
      };
      return { eventEmitterSymbol, syncId, isReceivingSynchronisation, payload };
    },
    ({ eventEmitterSymbol, syncId, isReceivingSynchronisation, payload }) => {
      if (isReceivingSynchronisation) {
        // Receiving sync — don't echo events back out.
        return;
      }
      if (syncId == null) {
        // Not synchronised.
        return;
      }
      if (eventEmitterSymbol == null) {
        // Used outside a chart context — bail silently.
        return;
      }
      // Dedupe identical consecutive emissions (see lastEmitted note above). The
      // payload is already a plain snapshot, so stringifying it here is safe.
      const fingerprint = JSON.stringify(payload);
      if (fingerprint === lastEmitted) {
        return;
      }
      lastEmitted = fingerprint;
      syncEventCenter.emit(TOOLTIP_SYNC_EVENT, syncId, payload, eventEmitterSymbol);
    },
  );
}

/**
 * EMITS brush sync events to other charts when the brush start/end indexes
 * change. Mirrors recharts' `useBrushChartSynchronisation`.
 */
export function useBrushChartSynchronisation(): void {
  const store = useAppStore();
  if (store == null) {
    return;
  }
  createEffect(
    () => {
      const syncId = selectSyncId(store.state);
      const eventEmitterSymbol = selectEventEmitter(store.state);
      const brushStartIndex = store.state.chartData.dataStartIndex;
      const brushEndIndex = store.state.chartData.dataEndIndex;
      return { syncId, eventEmitterSymbol, brushStartIndex, brushEndIndex };
    },
    ({ syncId, eventEmitterSymbol, brushStartIndex, brushEndIndex }) => {
      if (
        syncId == null ||
        brushStartIndex == null ||
        brushEndIndex == null ||
        eventEmitterSymbol == null
      ) {
        return;
      }
      const payload: BrushStartEndIndex = {
        startIndex: brushStartIndex,
        endIndex: brushEndIndex,
      };
      untrack(() => {
        syncEventCenter.emit(BRUSH_SYNC_EVENT, syncId, payload, eventEmitterSymbol);
      });
    },
  );
}
