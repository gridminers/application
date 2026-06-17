import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { Sparte } from '../../../core/models/sparte';
import { sparteLabel } from '../../../shared/chart-theme';

/**
 * Reusable filter bar that sits above a graph page and scopes every chart on
 * it at once. Each facet (division / asset / year) is an independent
 * multi-select; an empty selection means "all". The component is fully
 * controlled — the page owns the selection state and is notified via outputs.
 */
@Component({
  selector: 'app-graph-filter-bar',
  imports: [],
  templateUrl: './graph-filter-bar.html',
  styleUrl: './graph-filter-bar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GraphFilterBar {
  /** Divisions available to filter by. */
  readonly sparten = input<readonly Sparte[]>([]);
  /** Asset classes available to filter by. */
  readonly assets = input<readonly string[]>([]);
  /** Fiscal years available to filter by. */
  readonly years = input<readonly number[]>([]);

  /** Toggle visibility of each facet. */
  readonly showSparte = input(true);
  readonly showAsset = input(true);
  readonly showYear = input(true);

  /** Legend text for the asset facet (e.g. "Gewerk" on the Gewerke page). */
  readonly assetLabel = input('Assetklasse');

  /** Current selections (empty set = all). */
  readonly selectedSparten = input<ReadonlySet<Sparte>>(new Set<Sparte>());
  readonly selectedAssets = input<ReadonlySet<string>>(new Set<string>());
  readonly selectedYears = input<ReadonlySet<number>>(new Set<number>());

  readonly selectedSpartenChange = output<ReadonlySet<Sparte>>();
  readonly selectedAssetsChange = output<ReadonlySet<string>>();
  readonly selectedYearsChange = output<ReadonlySet<number>>();

  /** Whether any filter is currently active. */
  readonly hasActiveFilter = computed(
    () =>
      this.selectedSparten().size > 0 ||
      this.selectedAssets().size > 0 ||
      this.selectedYears().size > 0,
  );

  label(sparte: Sparte): string {
    return sparteLabel(sparte);
  }

  isSparteSelected(sparte: Sparte): boolean {
    return this.selectedSparten().has(sparte);
  }

  isAssetSelected(asset: string): boolean {
    return this.selectedAssets().has(asset);
  }

  isYearSelected(year: number): boolean {
    return this.selectedYears().has(year);
  }

  toggleSparte(sparte: Sparte): void {
    this.selectedSpartenChange.emit(toggle(this.selectedSparten(), sparte));
  }

  toggleAsset(asset: string): void {
    this.selectedAssetsChange.emit(toggle(this.selectedAssets(), asset));
  }

  toggleYear(year: number): void {
    this.selectedYearsChange.emit(toggle(this.selectedYears(), year));
  }

  clearSparten(): void {
    this.selectedSpartenChange.emit(new Set<Sparte>());
  }

  clearAssets(): void {
    this.selectedAssetsChange.emit(new Set<string>());
  }

  clearYears(): void {
    this.selectedYearsChange.emit(new Set<number>());
  }

  resetAll(): void {
    this.clearSparten();
    this.clearAssets();
    this.clearYears();
  }
}

/** Return a copy of `set` with `value` toggled. */
function toggle<T>(set: ReadonlySet<T>, value: T): ReadonlySet<T> {
  const next = new Set(set);
  if (next.has(value)) {
    next.delete(value);
  } else {
    next.add(value);
  }
  return next;
}
