import { Sparte, SPARTE_LABELS } from '../core/models/sparte';

/** Brand colours per utility division (mirrors CSS tokens in styles.css). */
export const SPARTE_COLORS: Record<Sparte, string> = {
  Strom: '#e8a700',
  Gas: '#d6531c',
  Wasser: '#1c7fd6',
  Infotechnik: '#7a4fd0',
  Fernwaerme: '#c0392b',
};

/**
 * Qualitative palette for non-division categories (e.g. cost types).
 * On-brand monochrome: led by the accent green and stepped through the
 * neutral grayscale, matching the "Neutral Monochrome Technical System".
 */
export const CATEGORY_PALETTE: readonly string[] = [
  '#00e639',
  '#72ff70',
  '#84967e',
  '#b9ccb2',
  '#3b4b37',
];

/* ------------------------------------------------------------------ *
 * Dark-theme chart styling tokens (mirror the CSS design tokens).
 * ECharts renders to a canvas and cannot read CSS variables, so the
 * palette is duplicated here.
 * ------------------------------------------------------------------ */

/** Accent green used for primary single-series charts. */
export const CHART_ACCENT = '#00e639';
/** Primary text colour on the dark canvas. */
export const CHART_TEXT = '#dae6d2';
/** Muted text colour for axis labels. */
export const CHART_TEXT_MUTED = '#b9ccb2';
/** Axis / border line colour. */
export const CHART_AXIS_LINE = '#3b4b37';
/** Subtle grid split lines. */
export const CHART_SPLIT_LINE = 'rgba(132, 150, 126, 0.18)';
/** Card surface colour — used to separate adjacent pie slices. */
export const CHART_SURFACE = '#182216';

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
    backgroundColor: '#222d20',
    borderColor: '#3b4b37',
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

/** Display label for a division. */
export function sparteLabel(sparte: Sparte): string {
  return SPARTE_LABELS[sparte];
}
