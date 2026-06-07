// Solid-native replacement for recharts 3.8.1 src/state/RechartsReduxContext.tsx.
//
// recharts used a dedicated react-redux context (so embedding Recharts inside a
// host app's own Redux store wouldn't clash). The Solid-native equivalent is a
// context carrying the composed `{ state, actions }` store.
//
// The default is `null` (a real value), NOT `undefined`: Solid treats an
// `undefined` default as "no default" and makes `useContext` THROW
// `ContextNotFoundError` outside a Provider. recharts' `useAppSelector`
// deliberately returns `undefined` outside a chart (so a component works
// standalone), so we default to `null` and the hooks map `null` → `undefined`.
import { createContext } from "solid-js";
import type { RechartsStore } from "./store";

export const RechartsStoreContext = createContext<RechartsStore | null>(null);
