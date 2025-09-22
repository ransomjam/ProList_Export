import { useCallback, useEffect, useState } from "react";

import {
  applyThemePreference,
  getThemePreference,
  persistThemePreference,
  type ThemePreference,
} from "@/utils/theme";

export const useTheme = () => {
  const [theme, setThemeState] = useState<ThemePreference>(() => getThemePreference());

  useEffect(() => {
    applyThemePreference(theme);
    persistThemePreference(theme);
  }, [theme]);

  const setTheme = useCallback((next: ThemePreference) => {
    setThemeState(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState(current => (current === "dark" ? "light" : "dark"));
  }, []);

  return {
    theme,
    setTheme,
    toggleTheme,
  };
};
