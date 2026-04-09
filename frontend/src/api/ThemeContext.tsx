import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

// Three preference values. "system" follows the OS-level color scheme and
// re-evaluates live whenever the user toggles their OS theme.
export type ThemeMode = "light" | "dark" | "system";

interface ThemeState {
  /** The user's stored preference: light, dark, or system. */
  mode: ThemeMode;
  /** The currently-applied theme after resolving "system" against the OS. */
  resolved: "light" | "dark";
  setMode: (mode: ThemeMode) => void;
}

const STORAGE_KEY = "ember-theme";
const ThemeContext = createContext<ThemeState | null>(null);

const getSystemTheme = (): "light" | "dark" =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";

const loadStoredMode = (): ThemeMode => {
  if (typeof window === "undefined") return "system";
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") return stored;
  } catch {
    /* localStorage unavailable — fall through */
  }
  return "system";
};

const applyThemeClass = (resolved: "light" | "dark") => {
  const root = document.documentElement;
  if (resolved === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
  // Help the browser render native form controls (scrollbars, date pickers)
  // with the right palette.
  root.style.colorScheme = resolved;
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => loadStoredMode());
  const [systemTheme, setSystemTheme] = useState<"light" | "dark">(() => getSystemTheme());

  // Watch the OS-level preference so "system" mode reacts live.
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e: MediaQueryListEvent) => setSystemTheme(e.matches ? "dark" : "light");
    // Safari <14 uses the deprecated addListener API.
    if (mq.addEventListener) mq.addEventListener("change", onChange);
    else mq.addListener(onChange);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", onChange);
      else mq.removeListener(onChange);
    };
  }, []);

  const resolved: "light" | "dark" = mode === "system" ? systemTheme : mode;

  // Apply the resolved theme class to <html> whenever it changes.
  useEffect(() => {
    applyThemeClass(resolved);
  }, [resolved]);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* non-fatal */
    }
  }, []);

  const value = useMemo<ThemeState>(() => ({ mode, resolved, setMode }), [mode, resolved, setMode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeState {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside a ThemeProvider");
  return ctx;
}
