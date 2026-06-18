import { Sparte, SPARTE_LABELS } from '../core/models/sparte';

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

/**
 * Qualitative palette for non-division categories (e.g. cost types).
 * On-brand monochrome: led by the accent green and stepped through the
 * neutral grayscale, matching the "Neutral Monochrome Technical System".
 */
export const CATEGORY_PALETTE: readonly string[] = [
  '#00e639',
  '#72ff70',
  '#8a8a8a',
  '#b8b8b8',
  '#3b3b3b',
];

/* ------------------------------------------------------------------ *
 * Dark-theme chart styling tokens (mirror the CSS design tokens).
 * ECharts renders to a canvas and cannot read CSS variables, so the
 * palette is duplicated here.
 * ------------------------------------------------------------------ */

/** Accent green used for primary single-series charts. */
export const CHART_ACCENT = '#00e639';
/** Primary text colour on the dark canvas. */
export const CHART_TEXT = '#e2e2e2';
/** Muted text colour for axis labels. */
export const CHART_TEXT_MUTED = '#b8b8b8';
/** Axis / border line colour. */
export const CHART_AXIS_LINE = '#3b3b3b';
/** Subtle grid split lines. */
export const CHART_SPLIT_LINE = 'rgba(138, 138, 138, 0.18)';
/** Card surface colour — used to separate adjacent pie slices. */
export const CHART_SURFACE = '#1a1a1a';

/** Monospaced font stack for data-heavy axis labels and legends. */
export const CHART_FONT_MONO =
  '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

/** Base textStyle shared by every chart. */
export const chartTextStyle = {
  color: CHART_TEXT,
  fontFamily: CHART_FONT_MONO,
} as const;

/** Default styling for a category/value axis on the dark canvas. */
export function darkAxis(): Record<string, unknown> {
  return {
    axisLabel: { color: CHART_TEXT_MUTED, fontFamily: CHART_FONT_MONO },
    axisLine: { lineStyle: { color: CHART_AXIS_LINE } },
    axisTick: { lineStyle: { color: CHART_AXIS_LINE } },
    splitLine: { lineStyle: { color: CHART_SPLIT_LINE } },
  };
}

/** Tooltip styling for the dark canvas. */
export function darkTooltip(): Record<string, unknown> {
  return {
    backgroundColor: '#242424',
    borderColor: '#3b3b3b',
    textStyle: { color: CHART_TEXT, fontFamily: CHART_FONT_MONO },
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
