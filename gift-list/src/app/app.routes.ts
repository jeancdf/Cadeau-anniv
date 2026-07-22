import { Routes } from '@angular/router';
import { GiftPlannerComponent } from './gift-planner/gift-planner.component';

export const routes: Routes = [
  { path: '', component: GiftPlannerComponent },
  {
    path: 'liste/:publicId',
    loadComponent: () => import('./shared-gift-list/shared-gift-list.component')
      .then(module => module.SharedGiftListComponent)
  },
  { path: '**', redirectTo: '' }
];
