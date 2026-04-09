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

const COOKIE_NAME = "ember-theme";
const COOKIE_MAX_DAYS = 365;
const ThemeContext = createContext<ThemeState | null>(null);

const getSystemTheme = (): "light" | "dark" =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";

// Read theme preference from a browser-accessible cookie (not httpOnly).
const readThemeCookie = (): ThemeMode => {
  if (typeof document === "undefined") return "light";
  const match = document.cookie.match(
    new RegExp("(?:^|; )" + COOKIE_NAME + "=([^;]*)")
  );
  const val = match ? decodeURIComponent(match[1]) : null;
  if (val === "light" || val === "dark" || val === "system") return val;
  return "light"; // default to light; users can change in account settings
};

// Write theme preference as a browser-accessible cookie (SameSite=Lax, no HttpOnly).
const writeThemeCookie = (mode: ThemeMode) => {
  const expires = new Date(Date.now() + COOKIE_MAX_DAYS * 864e5).toUTCString();
  document.cookie =
    `${COOKIE_NAME}=${encodeURIComponent(mode)}; expires=${expires}; path=/; SameSite=Lax`;
};

const loadStoredMode = (): ThemeMode => {
  if (typeof window === "undefined") return "system";
  return readThemeCookie();
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
    writeThemeCookie(next);
  }, []);

  const value = useMemo<ThemeState>(() => ({ mode, resolved, setMode }), [mode, resolved, setMode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeState {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside a ThemeProvider");
  return ctx;
}
