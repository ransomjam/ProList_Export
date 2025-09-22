import { Moon, Sun } from "lucide-react";

import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";

export const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className="flex items-center rounded-full border border-border/70 bg-muted/60 px-2 py-1 text-muted-foreground">
      <Sun
        className={cn(
          "mr-1 h-4 w-4 transition-opacity",
          isDark ? "opacity-30" : "opacity-100 text-amber-400",
        )}
        aria-hidden
      />
      <Switch
        checked={isDark}
        onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
        aria-label="Toggle dark mode"
        className="h-5 w-9"
      />
      <Moon
        className={cn(
          "ml-1 h-4 w-4 transition-opacity",
          isDark ? "opacity-100 text-sky-400" : "opacity-30",
        )}
        aria-hidden
      />
    </div>
  );
};
