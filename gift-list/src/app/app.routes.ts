import { Routes } from '@angular/router';
import { GiftPlannerComponent } from './gift-planner/gift-planner.component';
import { SharedListComponent } from './shared-list/shared-list.component';

export const routes: Routes = [
  { path: '', component: GiftPlannerComponent, title: 'Gift Finder — Trouver le cadeau juste' },
  { path: 'liste/:slug', component: SharedListComponent, title: 'Liste de cadeaux — Gift Finder' },
  { path: '**', redirectTo: '' }
];
