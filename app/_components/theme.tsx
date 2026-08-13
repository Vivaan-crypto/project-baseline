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
      className="press border-[3px] border-border bg-card p-2 text-foreground shadow-[var(--shadow-sm)] hover:bg-lime hover:text-on-lime"
    >
      {theme === null ? (
        <div className="h-6 w-6" />
      ) : theme === "dark" ? (
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className="h-6 w-6"
          aria-hidden
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      ) : (
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className="h-6 w-6"
          aria-hidden
        >
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <line x1="12" y1="21" x2="12" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <line x1="1" y1="12" x2="3" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <line x1="21" y1="12" x2="23" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      )}
    </button>
  );
}
