import { describe, it, expect } from "vitest";
import { flush } from "solid-js";
import { createRechartsStore } from "../../src/state/store";
import type { LegendPayloadEntry } from "../../src/state/legendSlice";

/*
 * Ported from recharts 3.8.1 test/state/legendSlice.spec.ts, adapted to the
 * Solid-native store (store.state / store.actions, flush(); no Redux dispatch) and
 * this port's legend-payload shape deviation: recharts stores a flat
 * `ReadonlyArray<LegendPayload>` and matches for removal by object reference; this
 * port stores `ReadonlyArray<LegendPayloadEntry>` (each entry has a stable `id`
 * holding its items) and matches for removal by `id`. The add/remove behaviour
 * recharts cares about is preserved.
 */

describe("legendSlice", () => {
  it("should add and remove legend payload from state", () => {
    const store = createRechartsStore();
    expect(store.state.legend.payload).toHaveLength(0);

    const entry1: LegendPayloadEntry = { id: "a", items: [{ dataKey: "key", value: "value" }] };
    const entry2: LegendPayloadEntry = { id: "b", items: [{ dataKey: "key", value: "value" }] };

    store.actions.legend.addLegendPayload(entry1);
    flush();
    expect(store.state.legend.payload).toHaveLength(1);

    store.actions.legend.addLegendPayload(entry2);
    flush();
    expect(store.state.legend.payload).toHaveLength(2);

    store.actions.legend.removeLegendPayload(entry1);
    flush();
    expect(store.state.legend.payload).toHaveLength(1);

    store.actions.legend.removeLegendPayload(entry2);
    flush();
    expect(store.state.legend.payload).toHaveLength(0);

    store.actions.legend.removeLegendPayload(entry1);
    flush();
    expect(store.state.legend.payload).toHaveLength(0);
  });
});
