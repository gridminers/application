import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/landing/landing/landing').then((m) => m.Landing),
    title: 'Gridminers — Netzdaten Braunschweig',
  },
  {
    path: 'sparte-assets',
    loadComponent: () =>
      import('./features/graphs/pages/sparte-assets/sparte-assets-page').then(
        (m) => m.SparteAssetsPage,
      ),
    title: 'Sparte / Assets — Gridminers',
  },
  {
    path: 'gewerke',
    loadComponent: () =>
      import('./features/graphs/pages/gewerke/gewerke-page').then((m) => m.GewerkePage),
    title: 'Gewerke — Gridminers',
  },
  {
    path: 'kostenvergleich',
    loadComponent: () =>
      import('./features/graphs/pages/cost-comparison/cost-comparison-page').then(
        (m) => m.CostComparisonPage,
      ),
    title: 'Plan / Ist Kostenvergleich — Gridminers',
  },
  {
    path: 'strassen',
    loadComponent: () =>
      import('./features/graphs/pages/street-details/street-details-page').then(
        (m) => m.StreetDetailsPage,
      ),
    title: 'Straßendetails — Gridminers',
  },
  {
    path: 'karte',
    loadComponent: () =>
      import('./features/graphs/pages/map/map-page').then((m) => m.MapPage),
    title: 'Karte — Gridminers',
  },
  {
    // Backwards-compatible alias for the previous single graph view.
    path: 'graphs',
    redirectTo: 'sparte-assets',
  },
  {
    path: '**',
    redirectTo: '',
  },
];
