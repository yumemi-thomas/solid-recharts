// Solid-native cross-chart synchronisation registry.
//
// recharts 3.8.1 synchronises charts through a global mitt `eventCenter`
// (`src/util/Events.ts`): on every tooltip/brush interaction a chart emits a
// `TOOLTIP_SYNC_EVENT`/`BRUSH_SYNC_EVENT` carrying `(syncId, action, emitter)`,
// and every chart subscribes to the same bus and filters by `syncId`/`emitter`.
// The Solid-native rewrite has NO Redux and intentionally NO mitt — but a module
// -level pub/sub registry is still the right shape for many-to-many cross-chart
// communication (each chart's store is an island; there is no shared reactive
// owner). This is a tiny synchronous emitter keyed by event name, deliberately
// mirroring the recharts `eventCenter` API surface (`on`/`off`/`emit`) so the
// behaviour — "send one event, every other subscriber receives it synchronously"
// — is identical, and so the vendored synchronisation specs port faithfully.
//
// Deviations from recharts:
//  - The payload is the *plain* `TooltipSyncState` object (recharts wraps it in a
//    Redux `PayloadAction` via `setSyncInteraction(payload)`; here
//    `setSyncInteraction` is a void store mutator, so the registry carries the
//    payload directly and receivers call `store.actions.tooltip.setSyncInteraction`).
//  - Emission happens from component effects (not a Redux middleware). Writes into
//    a receiver's store therefore go through the store's batched setter; the
//    registry itself holds no reactive state, so subscribing/emitting never reads
//    or writes a tracked scope (no STRICT_READ / SIGNAL_WRITE_IN_OWNED_SCOPE).
import { BrushStartEndIndex } from "../context/brushUpdateContext";
import { TooltipSyncState } from "../state/tooltipSlice";

export const TOOLTIP_SYNC_EVENT = "recharts.syncEvent.tooltip";
export const BRUSH_SYNC_EVENT = "recharts.syncEvent.brush";

export type SyncId = number | string;

export type TooltipSyncListener = (
  syncId: SyncId,
  payload: TooltipSyncState,
  emitter: symbol,
) => void;

export type BrushSyncListener = (
  syncId: SyncId,
  payload: BrushStartEndIndex,
  emitter: symbol,
) => void;

// Two separately-typed listener sets — one per event. The public methods below are
// typed via overloads (faithful to recharts' eventCenter signature); their shared
// implementation takes the argument list as a union of tuples discriminated by the
// event name, so checking the name narrows the listener and the payload with it.
const tooltipListeners = new Set<TooltipSyncListener>();
const brushListeners = new Set<BrushSyncListener>();

type ListenerArgs =
  | [eventName: typeof TOOLTIP_SYNC_EVENT, listener: TooltipSyncListener]
  | [eventName: typeof BRUSH_SYNC_EVENT, listener: BrushSyncListener];

type EmitArgs =
  | [
      eventName: typeof TOOLTIP_SYNC_EVENT,
      syncId: SyncId,
      payload: TooltipSyncState,
      emitter: symbol,
    ]
  | [
      eventName: typeof BRUSH_SYNC_EVENT,
      syncId: SyncId,
      payload: BrushStartEndIndex,
      emitter: symbol,
    ];

// Copy first so a listener that unsubscribes during dispatch doesn't mutate the
// set we're iterating (matches mitt's array-snapshot semantics).
function snapshot<L>(set: Set<L>): ReadonlyArray<L> {
  return Array.from(set);
}

/**
 * Overloaded surface of the bus. Interface declarations may carry method
 * overloads (object-literal methods may not — the toolchain's formatter rejects
 * them), so the typed `on`/`off`/`emit` overloads live here and the concrete
 * object below is annotated with this type.
 */
interface SyncEventCenter {
  on(eventName: typeof TOOLTIP_SYNC_EVENT, listener: TooltipSyncListener): void;
  on(eventName: typeof BRUSH_SYNC_EVENT, listener: BrushSyncListener): void;
  off(eventName: typeof TOOLTIP_SYNC_EVENT, listener: TooltipSyncListener): void;
  off(eventName: typeof BRUSH_SYNC_EVENT, listener: BrushSyncListener): void;
  emit(
    eventName: typeof TOOLTIP_SYNC_EVENT,
    syncId: SyncId,
    payload: TooltipSyncState,
    emitter: symbol,
  ): void;
  emit(
    eventName: typeof BRUSH_SYNC_EVENT,
    syncId: SyncId,
    payload: BrushStartEndIndex,
    emitter: symbol,
  ): void;
}

/**
 * The cross-chart synchronisation bus. Mirrors the `on`/`off`/`emit` surface of
 * recharts' mitt `eventCenter` so synchronisation logic and tests read 1:1, but
 * is a plain synchronous emitter with no reactive graph of its own.
 *
 * The event-name argument comes first (`on(TOOLTIP_SYNC_EVENT, …)`) for 1:1
 * parity with recharts' eventCenter call sites and the vendored specs.
 */
export const syncEventCenter: SyncEventCenter = {
  on(...[eventName, listener]: ListenerArgs): void {
    if (eventName === TOOLTIP_SYNC_EVENT) {
      tooltipListeners.add(listener);
    } else {
      brushListeners.add(listener);
    }
  },
  off(...[eventName, listener]: ListenerArgs): void {
    if (eventName === TOOLTIP_SYNC_EVENT) {
      tooltipListeners.delete(listener);
    } else {
      brushListeners.delete(listener);
    }
  },
  emit(...[eventName, syncId, payload, emitter]: EmitArgs): void {
    if (eventName === TOOLTIP_SYNC_EVENT) {
      for (const listener of snapshot(tooltipListeners)) {
        listener(syncId, payload, emitter);
      }
      return;
    }
    for (const listener of snapshot(brushListeners)) {
      listener(syncId, payload, emitter);
    }
  },
};
