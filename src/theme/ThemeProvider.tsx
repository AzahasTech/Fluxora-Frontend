import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

/**
 * The only theme values the app understands. Anything outside this union —
 * including tampered or corrupted `localStorage` entries — is rejected before
 * it can reach the DOM, preventing `data-theme` attribute injection.
 */
export type Theme = "light" | "dark";

/**
 * Valid font modes supported by the app.
 * "default" uses Plus Jakarta Sans; "dyslexic" swaps to OpenDyslexic / Atkinson Hyperlegible
 * with looser letter-spacing and line-height tokens.
 */
export type FontMode = "default" | "dyslexic";

/** `localStorage` key under which the user's explicit theme choice is persisted. */
export const THEME_STORAGE_KEY = "theme";

/** `localStorage` key under which the user's explicit font mode choice is persisted. */
export const FONT_STORAGE_KEY = "font-mode";

/** Media query used to detect the operating-system colour-scheme preference. */
const DARK_MEDIA_QUERY = "(prefers-color-scheme: dark)";

/**
 * Narrowing type guard for {@link Theme}.
 *
 * Used as the single validation gate for every untrusted source of a theme
 * value (`localStorage`, `storage` events from other tabs). Returning `false`
 * here is what keeps an attacker-controlled string from ever being written to
 * `document.documentElement`.
 *
 * @param value - Any candidate value, typically a string read from storage.
 * @returns `true` only when `value` is exactly `"light"` or `"dark"`.
 */
export function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark";
}

/**
 * Narrowing type guard for {@link FontMode}.
 *
 * Single validation gate for untrusted font mode values (`localStorage`,
 * cross-tab `storage` events). Rejects tampered strings before updating DOM.
 *
 * @param value - Any candidate value, typically a string read from storage.
 * @returns `true` only when `value` is exactly `"default"` or `"dyslexic"`.
 */
export function isFontMode(value: unknown): value is FontMode {
  return value === "default" || value === "dyslexic";
}

/**
 * Reads the persisted theme, validating it against {@link isTheme}.
 *
 * @returns The stored {@link Theme}, or `null` when nothing valid is stored
 * (no entry, an invalid/tampered entry, or storage being unavailable).
 */
function getStoredTheme(): Theme | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(stored) ? stored : null;
  } catch {
    // Accessing localStorage can throw (Safari private mode, disabled storage).
    return null;
  }
}

/**
 * Reads the persisted font mode, validating it against {@link isFontMode}.
 *
 * @returns The stored {@link FontMode}, or `null` when nothing valid is stored.
 */
function getStoredFontMode(): FontMode | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(FONT_STORAGE_KEY);
    return isFontMode(stored) ? stored : null;
  } catch {
    return null;
  }
}

/**
 * Resolves the current operating-system colour-scheme preference.
 *
 * @returns `"dark"` when the OS prefers a dark scheme, otherwise `"light"`.
 * Falls back to `"light"` in non-browser / SSR environments.
 */
function getSystemTheme(): Theme {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return "light";
  }
  return window.matchMedia(DARK_MEDIA_QUERY).matches ? "dark" : "light";
}

/**
 * Computes the theme to use on first paint: an explicit stored choice wins,
 * otherwise we follow the OS preference.
 */
export function resolveInitialTheme(): Theme {
  return getStoredTheme() ?? getSystemTheme();
}

/**
 * Computes the font mode to use on first paint: stored choice wins, else "default".
 */
export function resolveInitialFontMode(): FontMode {
  return getStoredFontMode() ?? "default";
}

/**
 * Applies a theme to the document root. This is the **single place** in the
 * app that mutates the `data-theme` attribute.
 *
 * @param theme - A validated {@link Theme} to apply.
 */
export function applyTheme(theme: Theme): void {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", theme);
}

/**
 * Applies a font mode to the document root (`data-font` attribute).
 *
 * @param mode - A validated {@link FontMode} to apply.
 */
export function applyFontMode(mode: FontMode): void {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-font", mode);
}

/**
 * Resolves and applies the initial theme synchronously, before React renders.
 *
 * Call this once from the app entry point so the correct `data-theme` and `data-font` are set
 * ahead of the first paint, avoiding a flash of the wrong theme or font (FOUC).
 *
 * @returns The {@link Theme} that was applied.
 */
export function initTheme(): Theme {
  const theme = resolveInitialTheme();
  applyTheme(theme);
  const fontMode = resolveInitialFontMode();
  applyFontMode(fontMode);
  return theme;
}

/**
 * Resolves and applies the initial font mode synchronously.
 *
 * @returns The {@link FontMode} that was applied.
 */
export function initFontMode(): FontMode {
  const fontMode = resolveInitialFontMode();
  applyFontMode(fontMode);
  return fontMode;
}

/** Value exposed by {@link useTheme}. */
export interface ThemeContextValue {
  /** The currently active theme. */
  theme: Theme;
  /** Sets an explicit theme; persists the choice and stops OS-preference following. */
  setTheme: (theme: Theme) => void;
  /** Flips between `"light"` and `"dark"` as an explicit choice. */
  toggleTheme: () => void;
  /** The currently active font mode ("default" or "dyslexic"). */
  fontMode: FontMode;
  /** Sets an explicit font mode ("default" or "dyslexic"). */
  setFontMode: (mode: FontMode) => void;
  /** Flips between `"default"` and `"dyslexic"` as an explicit choice. */
  toggleFontMode: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Provides theme and font mode state to the tree and keeps DOM attributes in sync from one
 * place. Responsibilities:
 *
 * - Initialises theme from `localStorage`, falling back to OS preference.
 * - Initialises font mode from `localStorage`, falling back to `"default"`.
 * - Synchronises theme and font mode across tabs via the `storage` event.
 * - Validates every untrusted value through {@link isTheme} and {@link isFontMode}.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(resolveInitialTheme);
  const [fontMode, setFontModeState] = useState<FontMode>(resolveInitialFontMode);

  // Whether the user (in this tab or another) has explicitly picked a theme.
  const hasExplicitChoiceRef = useRef<boolean>(getStoredTheme() !== null);

  // Mirror state to the DOM whenever it changes.
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    applyFontMode(fontMode);
  }, [fontMode]);

  const setTheme = useCallback((next: Theme) => {
    hasExplicitChoiceRef.current = true;
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Ignore persistence failures; in-memory state still updates the UI.
    }
    setThemeState(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "light" ? "dark" : "light");
  }, [theme, setTheme]);

  const setFontMode = useCallback((next: FontMode) => {
    try {
      window.localStorage.setItem(FONT_STORAGE_KEY, next);
    } catch {
      // Ignore persistence failures; in-memory state still updates the UI.
    }
    setFontModeState(next);
  }, []);

  const toggleFontMode = useCallback(() => {
    setFontMode(fontMode === "default" ? "dyslexic" : "default");
  }, [fontMode, setFontMode]);

  // Follow the OS colour-scheme preference
  useEffect(() => {
    if (typeof window.matchMedia !== "function") {
      return undefined;
    }

    const mediaQuery = window.matchMedia(DARK_MEDIA_QUERY);
    const handleChange = (event: MediaQueryListEvent) => {
      if (hasExplicitChoiceRef.current) return;
      setThemeState(event.matches ? "dark" : "light");
    };

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }

    // Safari < 14 fallback.
    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  // Cross-tab synchronisation for theme and font mode
  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY) {
        if (event.newValue === null) {
          hasExplicitChoiceRef.current = false;
          setThemeState(getSystemTheme());
          return;
        }

        if (isTheme(event.newValue)) {
          hasExplicitChoiceRef.current = true;
          setThemeState(event.newValue);
        }
      } else if (event.key === FONT_STORAGE_KEY) {
        if (event.newValue === null) {
          setFontModeState("default");
          return;
        }

        if (isFontMode(event.newValue)) {
          setFontModeState(event.newValue);
        }
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, setTheme, toggleTheme, fontMode, setFontMode, toggleFontMode }),
    [theme, setTheme, toggleTheme, fontMode, setFontMode, toggleFontMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * Accesses the current theme, font mode, and their mutators.
 *
 * @throws If called outside of a {@link ThemeProvider}.
 * @returns The {@link ThemeContextValue} for the nearest provider.
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (context === null) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
