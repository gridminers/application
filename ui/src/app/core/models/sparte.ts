/** Utility division a project belongs to (Sparte). */
export type Sparte =
  | 'Strom'
  | 'Gas'
  | 'Wasser'
  | 'Infotechnik'
  | 'Fernwaerme'
  | 'Sonstige';

/** All divisions in display order. */
export const SPARTEN: readonly Sparte[] = [
  'Strom',
  'Gas',
  'Wasser',
  'Infotechnik',
  'Fernwaerme',
  'Sonstige',
] as const;

/** Human-readable label for a division (umlauts restored for display). */
export const SPARTE_LABELS: Record<Sparte, string> = {
  Strom: 'Strom',
  Gas: 'Gas',
  Wasser: 'Wasser',
  Infotechnik: 'Infotechnik',
  Fernwaerme: 'Fernwärme',
  Sonstige: 'Sonstige',
};
