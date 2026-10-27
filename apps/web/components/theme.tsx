"use client";

import { ThemeProvider as NextThemes, useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

/** Follows the system theme, with a toggle to override. next-themes writes the class before paint, so there is no flash. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemes attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </NextThemes>
  );
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // The theme is unknown until the client mounts; render a same-size placeholder to avoid a jump.
  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";
  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={`flex size-10 items-center justify-center rounded-full border border-line text-fg transition-colors hover:border-fg ${className}`}
    >
      {mounted ? isDark ? <Sun size={17} /> : <Moon size={17} /> : <span className="size-[17px]" />}
    </button>
  );
}
