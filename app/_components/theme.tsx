"use client";

import { useEffect, useState } from "react";

export const THEME_STORAGE_KEY = "baseline-theme";

/**
 * Injected synchronously into <head> by the root layout, before first paint.
 * Deliberately terse and dependency-free — it blocks rendering, so every
 * byte is on the critical path.
 *
 * Wrapped in try/catch because localStorage throws outright in some
 * privacy modes; a theme preference is never worth breaking the page over,
 * so the failure mode is "fall back to the OS preference".
 */
export const THEME_INIT_SCRIPT = `
try {
  var s = localStorage.getItem('${THEME_STORAGE_KEY}');
  var d = s ? s === 'dark'
            : matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.dataset.theme = d ? 'dark' : 'light';
} catch (e) {
  document.documentElement.dataset.theme = 'light';
}
`.trim();

type Theme = "light" | "dark";

export function ThemeToggle() {
  // Starts null, not a guessed default: the real theme lives on <html>
  // (set by the script above) and isn't knowable during SSR. Rendering a
  // guess would flash the wrong icon on first paint.
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    setTheme(
      document.documentElement.dataset.theme === "dark" ? "dark" : "light",
    );
  }, []);

  // Follow the OS while the user has expressed no preference of their own.
  // Once they click the toggle we stop listening — an explicit choice
  // should not be silently overridden when the OS flips at sunset.
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const onChange = (event: MediaQueryListEvent) => {
      if (localStorage.getItem(THEME_STORAGE_KEY)) return;
      const next: Theme = event.matches ? "dark" : "light";
      document.documentElement.dataset.theme = next;
      setTheme(next);
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    setTheme(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Non-fatal: the theme still applies for this session.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={
        theme === null
          ? "Toggle theme"
          : `Switch to ${theme === "dark" ? "light" : "dark"} theme`
      }
      className="press border-[3px] border-border bg-card px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-wide text-foreground shadow-[var(--shadow-sm)] hover:bg-lime hover:text-on-lime"
    >
      {/* Fixed-width so the button never reflows when the label changes. */}
      <span className="inline-block w-9 text-center">
        {theme === null ? " " : theme === "dark" ? "Dark" : "Light"}
      </span>
    </button>
  );
}
