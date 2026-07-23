import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./landing/landing.component').then(module => module.LandingComponent),
    title: 'Gift Finder — Trouver le cadeau juste'
  },
  {
    path: 'creer',
    loadComponent: () => import('./gift-planner/gift-planner.component').then(module => module.GiftPlannerComponent),
    title: 'Créer une liste — Gift Finder'
  },
  {
    path: 'mes-listes',
    loadComponent: () => import('./account-lists/account-lists.component').then(module => module.AccountListsComponent),
    title: 'Mes listes — Gift Finder'
  },
  {
    path: 'statistiques',
    loadComponent: () => import('./stats/stats.component').then(module => module.StatsComponent),
    title: 'Statistiques — Gift Finder'
  },
  {
    path: 'liste/:slug',
    loadComponent: () => import('./shared-list/shared-list.component').then(module => module.SharedListComponent),
    title: 'Liste de cadeaux — Gift Finder'
  },
  { path: '**', redirectTo: '' }
];
