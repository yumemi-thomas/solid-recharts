// Solid-native replacement for recharts 3.8.1 src/state/RechartsStoreProvider.tsx.
//
// recharts created the store once in a `useRef` and provided it via react-redux's
// <Provider>. In Solid the component body runs once, so creating the store in the
// body is the natural "create once per chart instance" — each chart gets its own
// independent store (recharts supports many charts per page). The context value
// IS the provider in Solid 2.0: `<RechartsStoreContext value={store}>`.
//
// NOTE: the panorama branch (Brush's preview chart reuses the parent store by
// rendering no Provider) is deferred until PanoramaContext is ported.
import { untrack } from "solid-js";
import type { JSX } from "@solidjs/web";
import { RechartsStoreContext } from "./RechartsStoreContext";
import { createRechartsStore, type RechartsRootState } from "./store";

export interface RechartsStoreProviderProps {
  children: JSX.Element;
  preloadedState?: Partial<RechartsRootState>;
}

export function RechartsStoreProvider(props: RechartsStoreProviderProps): JSX.Element {
  // Create the store once. `preloadedState` is one-time config, so read it
  // untracked (it should not make store creation reactive).
  const store = createRechartsStore(untrack(() => props.preloadedState));

  return <RechartsStoreContext value={store}>{props.children}</RechartsStoreContext>;
}
