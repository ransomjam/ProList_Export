import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getFromStorage, setToStorage } from "@/utils/storage";

const THEME_STORAGE_KEY = "theme_preference";

type ThemeMode = "light" | "dark";

const getInitialTheme = (): ThemeMode => {
  if (typeof window === "undefined") {
    return "light";
  }

  const stored = getFromStorage<string>(THEME_STORAGE_KEY, "light");
  if (stored === "dark" || stored === "light") {
    return stored;
  }

  const prefersDark = typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-color-scheme: dark)").matches
    : false;

  if (prefersDark) {
    return "dark";
  }

  return "light";
};

export const ThemeToggle = () => {
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    document.documentElement.classList.toggle("dark", theme === "dark");

    if (typeof window !== "undefined") {
      setToStorage(THEME_STORAGE_KEY, theme);
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((current) => (current === "light" ? "dark" : "light"));
  };

  const nextTheme = theme === "light" ? "dark" : "light";

  return (
    <Button
      variant="outline"
      size="icon"
      className="fixed right-4 top-4 z-50 h-9 w-9 rounded-full bg-background/90 shadow-sm backdrop-blur"
      onClick={toggleTheme}
      aria-label={`Switch to ${nextTheme} mode`}
      title={`Switch to ${nextTheme} mode`}
    >
      {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
    </Button>
  );
};
