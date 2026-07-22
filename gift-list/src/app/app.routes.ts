import { Routes } from '@angular/router';
import { GiftPlannerComponent } from './gift-planner/gift-planner.component';
import { SharedListComponent } from './shared-list/shared-list.component';
import { LandingComponent } from './landing/landing.component';
import { AccountListsComponent } from './account-lists/account-lists.component';

export const routes: Routes = [
  { path: '', component: LandingComponent, title: 'Gift Finder — Trouver le cadeau juste' },
  { path: 'creer', component: GiftPlannerComponent, title: 'Créer une liste — Gift Finder' },
  { path: 'mes-listes', component: AccountListsComponent, title: 'Mes listes — Gift Finder' },
  { path: 'liste/:slug', component: SharedListComponent, title: 'Liste de cadeaux — Gift Finder' },
  { path: '**', redirectTo: '' }
];
