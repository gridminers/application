import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/landing/landing/landing').then((m) => m.Landing),
    title: 'Gridminers — Netzdaten Braunschweig',
  },
  {
    path: 'graphs',
    loadComponent: () => import('./features/graphs/graphs/graphs').then((m) => m.Graphs),
    title: 'Graphen — Gridminers',
  },
  {
    path: '**',
    redirectTo: '',
  },
];
