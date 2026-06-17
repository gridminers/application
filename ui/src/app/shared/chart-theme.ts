import { Sparte, SPARTE_LABELS } from '../core/models/sparte';

/** Brand colours per utility division (mirrors CSS tokens in styles.css). */
export const SPARTE_COLORS: Record<Sparte, string> = {
  Strom: '#e8a700',
  Gas: '#d6531c',
  Wasser: '#1c7fd6',
  Infotechnik: '#7a4fd0',
  Fernwaerme: '#c0392b',
};

/** Qualitative palette for non-division categories (e.g. cost types). */
export const CATEGORY_PALETTE: readonly string[] = [
  '#1c5fd6',
  '#0e9f6e',
  '#e8a700',
  '#7a4fd0',
  '#d6531c',
];

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
