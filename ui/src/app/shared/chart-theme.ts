import { Sparte, SPARTE_LABELS } from '../core/models/sparte';
import { isLightTheme } from '../core/theme/theme';

/** Brand colours per utility division (mirrors CSS tokens in styles.css). */
export const SPARTE_COLORS: Record<Sparte, string> = {
  Strom: '#e8a700',
  Gas: '#d6531c',
  Wasser: '#1c7fd6',
  Infotechnik: '#7a4fd0',
  Fernwaerme: '#c0392b',
  Sonstige: '#8a8a8a',
};

/**
 * Colour per division (Sparte) used to mark streets on the map. Distinct,
 * saturated hues chosen to stay legible on the dark basemap. Shared so charts
 * (e.g. the street-details bars) can match the map's line colours.
 */
export const STREET_COLORS: Record<Sparte, string> = {
  Strom: '#ffd400', // yellow
  Gas: '#00e639', // green
  Fernwaerme: '#ff3b30', // red
  Wasser: '#2b9bff', // blue
  Infotechnik: '#ff3bd4', // magenta
  Sonstige: '#9aa0a6', // neutral grey
};

/* ------------------------------------------------------------------ *
 * Theme-aware chart styling tokens. ECharts renders to a canvas and
 * cannot read CSS variables, so the two palettes are mirrored here and
 * selected at build time via the reactive `theme` signal. Because the
 * helpers below read that signal, any chart `computed()` that calls them
 * recomputes when the user switches themes.
 *
 * The light palette uses the BS|NETZ brand colours:
 *   Blau #003399 (100/60/30/10) and Rot #CC0000 (100/60/30/10).
 * ------------------------------------------------------------------ */

/** Pick the dark or light variant for the active theme. */
function pick<T>(dark: T, light: T): T {
  return isLightTheme() ? light : dark;
}

/** Accent colour for primary single-series charts (green / BS Blau). */
export function chartAccent(): string {
  return pick('#00e639', '#003399');
}

/** Translucent accent fill (e.g. line-chart area). */
export function chartAccentSoft(): string {
  return pick('rgba(0, 230, 57, 0.12)', 'rgba(0, 51, 153, 0.08)');
}

/** Translucent accent fill for difference bars (Blau 30 in light mode). */
export function chartAccentBar(): string {
  return pick('rgba(0, 230, 57, 0.4)', 'rgba(0, 51, 153, 0.3)');
}

/** Secondary series colour (amber / BS Rot) — e.g. Ist vs. Plan. */
export function chartSecondary(): string {
  return pick('#e8a700', '#cc0000');
}

/** Translucent secondary fill for difference bars (Rot 30 in light mode). */
export function chartSecondaryBar(): string {
  return pick('rgba(232, 167, 0, 0.4)', 'rgba(204, 0, 0, 0.3)');
}

/** Primary text colour on the chart canvas. */
export function chartText(): string {
  return pick('#e2e2e2', '#1a2233');
}

/** Muted text colour for axis labels. */
export function chartTextMuted(): string {
  return pick('#b8b8b8', '#56607a');
}

/** Axis / border line colour. */
export function chartAxisLine(): string {
  return pick('#3b3b3b', '#d4dae9');
}

/** Subtle grid split lines. */
export function chartSplitLine(): string {
  return pick('rgba(138, 138, 138, 0.18)', 'rgba(0, 51, 153, 0.1)');
}

/** Card surface colour — used to separate adjacent pie slices / bars. */
export function chartSurface(): string {
  return pick('#1a1a1a', '#ffffff');
}

/**
 * Qualitative palette for non-division categories (e.g. cost types).
 * Dark: on-brand monochrome led by the accent green through neutral greys.
 * Light: BS Blau and Rot stepped through their accepted opacities.
 */
export function categoryPalette(): string[] {
  return isLightTheme()
    ? [
        '#003399', // Blau 100
        '#cc0000', // Rot 100
        'rgba(0, 51, 153, 0.6)', // Blau 60
        'rgba(204, 0, 0, 0.6)', // Rot 60
        'rgba(0, 51, 153, 0.3)', // Blau 30
      ]
    : ['#00e639', '#72ff70', '#8a8a8a', '#b8b8b8', '#3b3b3b'];
}

/** Monospaced font stack for data-heavy axis labels and legends. */
export const CHART_FONT_MONO =
  '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

/** Base textStyle shared by every chart (theme-aware text colour). */
export function chartTextStyle(): Record<string, unknown> {
  return {
    color: chartText(),
    fontFamily: CHART_FONT_MONO,
  };
}

/** Default styling for a category/value axis, themed to the active scheme. */
export function chartAxis(): Record<string, unknown> {
  return {
    axisLabel: { color: chartTextMuted(), fontFamily: CHART_FONT_MONO },
    axisLine: { lineStyle: { color: chartAxisLine() } },
    axisTick: { lineStyle: { color: chartAxisLine() } },
    splitLine: { lineStyle: { color: chartSplitLine() } },
  };
}

/** Tooltip styling, themed to the active scheme. */
export function chartTooltip(): Record<string, unknown> {
  return {
    backgroundColor: pick('#242424', '#ffffff'),
    borderColor: pick('#3b3b3b', '#d4dae9'),
    textStyle: { color: chartText(), fontFamily: CHART_FONT_MONO },
  };
}


/** Format a number as euros without decimals (de-DE). */
export function formatEuro(value: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Compact euro label for axis ticks. Scales the unit to the magnitude so the
 * German thousands separator can't be mistaken for a decimal point
 * (e.g. 1_500_000 → "1,5 Mio." instead of an ambiguous "1.500 Tsd.").
 */
export function formatAxisEuro(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) {
    return `${(value / 1_000_000).toLocaleString('de-DE', { maximumFractionDigits: 1 })} Mio.`;
  }
  if (abs >= 1_000) {
    return `${(value / 1_000).toLocaleString('de-DE', { maximumFractionDigits: 0 })} Tsd.`;
  }
  return value.toLocaleString('de-DE');
}

/** Display label for a division. */
export function sparteLabel(sparte: Sparte): string {
  return SPARTE_LABELS[sparte];
}
