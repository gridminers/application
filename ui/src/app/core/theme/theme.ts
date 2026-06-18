import { signal } from '@angular/core';

/** The two supported colour schemes. */
export type Theme = 'dark' | 'light';

/** localStorage key under which the user's explicit choice is remembered. */
const STORAGE_KEY = 'gm-theme';

/** Theme-colour meta values for the browser UI (address bar, etc.). */
const META_COLOR: Record<Theme, string> = {
  dark: '#0c160a',
  light: '#ffffff',
};

/**
 * Resolve the theme to start with. Order of precedence:
 *   1. an attribute already set on <html> (by the index.html bootstrap script),
 *   2. an explicit choice saved in localStorage,
 *   3. the operating-system preference,
 *   4. dark (the app's original, default look).
 */
function readInitial(): Theme {
  if (typeof document !== 'undefined') {
    const fromDom = document.documentElement.dataset['theme'];
    if (fromDom === 'light' || fromDom === 'dark') {
      return fromDom;
    }
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }
  } catch {
    /* localStorage may be unavailable (private mode); fall through. */
  }
  if (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-color-scheme: light)').matches
  ) {
    return 'light';
  }
  return 'dark';
}

/**
 * Reactive, app-wide colour scheme. Read it inside a `computed()` or `effect()`
 * (e.g. in ECharts option builders) so the dependent recomputes when the user
 * switches themes.
 */
export const theme = signal<Theme>(readInitial());

/** Whether the active theme is the light (BS Netz) scheme. */
export function isLightTheme(): boolean {
  return theme() === 'light';
}

/** Reflect the active theme onto the document (attribute + browser chrome). */
function applyToDom(value: Theme): void {
  if (typeof document === 'undefined') {
    return;
  }
  const root = document.documentElement;
  root.dataset['theme'] = value;
  root.style.colorScheme = value;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', META_COLOR[value]);
}

/** Switch to an explicit theme, persist the choice and update the document. */
export function setTheme(value: Theme): void {
  theme.set(value);
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    /* Persisting is best-effort. */
  }
  applyToDom(value);
}

/** Flip between dark and light. */
export function toggleTheme(): void {
  setTheme(theme() === 'dark' ? 'light' : 'dark');
}

/** Apply the initial theme to the document. Call once during bootstrap. */
export function initTheme(): void {
  applyToDom(theme());
}
