"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { buttonStyles } from "@/components/ui/button";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button
        type="button"
        aria-label="Temayı değiştir"
        className={buttonStyles({
          variant: "secondary",
          size: "icon-sm",
          className: `opacity-50 ${className || ""}`,
        })}
        disabled
      >
        <Sun className="h-4 w-4 text-muted" />
      </button>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Açık temaya geç" : "Koyu temaya geç"}
      title={isDark ? "Açık temaya geç" : "Koyu temaya geç"}
      className={buttonStyles({
        variant: "secondary",
        size: "icon-sm",
        className: `shrink-0 transition-all duration-200 hover:scale-105 hover:border-accent/50 ${className || ""}`,
      })}
    >
      {isDark ? (
        <Sun className="h-4 w-4 text-accent-strong transition-transform rotate-0 scale-100" />
      ) : (
        <Moon className="h-4 w-4 text-sky-600 transition-transform rotate-0 scale-100" />
      )}
    </button>
  );
}
