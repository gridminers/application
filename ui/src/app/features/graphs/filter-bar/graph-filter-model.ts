import { computed, Signal, signal, WritableSignal } from '@angular/core';

import { Project } from '../../../core/models/project';
import { Sparte, SPARTEN } from '../../../core/models/sparte';
import { aggregateAssets, aggregateYears } from '../../../core/services/project-data';
import { filterProjects } from '../../../core/services/project-derivations';

/**
 * Reactive filter state shared by the graph pages. Holds the current selection,
 * derives the available facet options from the source data, and exposes the
 * filtered project subset. Built from plain signals so it can live as a field
 * on a page component.
 */
export interface GraphFilterModel {
  readonly selectedSparten: WritableSignal<ReadonlySet<Sparte>>;
  readonly selectedAssets: WritableSignal<ReadonlySet<string>>;
  readonly selectedYears: WritableSignal<ReadonlySet<number>>;
  readonly availableSparten: Signal<Sparte[]>;
  readonly availableAssets: Signal<string[]>;
  readonly availableYears: Signal<number[]>;
  readonly filtered: Signal<Project[]>;
}

/** Create a {@link GraphFilterModel} bound to a source project signal. */
export function createGraphFilterModel(
  source: Signal<readonly Project[]>,
): GraphFilterModel {
  const selectedSparten = signal<ReadonlySet<Sparte>>(new Set<Sparte>());
  const selectedAssets = signal<ReadonlySet<string>>(new Set<string>());
  const selectedYears = signal<ReadonlySet<number>>(new Set<number>());

  const availableSparten = computed(() =>
    SPARTEN.filter((s) => source().some((p) => p.sparte === s)),
  );

  // Asset options narrow to the chosen divisions (all divisions when none set).
  const availableAssets = computed(() => {
    const sparten = selectedSparten();
    const inScope = sparten.size
      ? source().filter((p) => sparten.has(p.sparte))
      : source();
    return aggregateAssets(inScope);
  });

  const availableYears = computed(() => aggregateYears(source()));

  const filtered = computed(() =>
    filterProjects(source(), {
      sparten: selectedSparten(),
      assets: selectedAssets(),
      years: selectedYears(),
    }),
  );

  return {
    selectedSparten,
    selectedAssets,
    selectedYears,
    availableSparten,
    availableAssets,
    availableYears,
    filtered,
  };
}
