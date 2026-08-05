import { createContext, useContext } from "solid-js";
import type { RechartsTheme } from "./RechartsTheme";
import { legacyTheme } from "./legacyTheme";

const RechartsThemeContext = createContext<RechartsTheme>(legacyTheme);

/** Applies a theme to every chart in its Solid owner tree. @experimental */
export const RechartsThemeProvider = RechartsThemeContext.Provider;

/** Reads the active Recharts theme. @experimental */
export const useRechartsTheme = (): RechartsTheme => useContext(RechartsThemeContext);
