import { of } from 'rxjs';
import { GiftPlannerComponent } from './gift-planner.component';
import { GiftPlannerService } from '../services/gift-planner.service';
import { SharedListService } from '../services/shared-list.service';

describe('GiftPlannerComponent sharing', () => {
  beforeEach(() => localStorage.clear());

  it('ouvre une publication avec un slug lisible puis conserve le lien créé', () => {
    const plannerService = jasmine.createSpyObj<GiftPlannerService>('GiftPlannerService', ['chat']);
    const sharedListService = jasmine.createSpyObj<SharedListService>('SharedListService', [
      'createSharedList',
      'updateSharedList',
      'hasEditToken',
      'getPublicUrl',
      'previewProduct'
    ]);
    sharedListService.createSharedList.and.returnValue(of({
      list: {
        slug: 'ma-liste-anniversaire',
        title: 'Ma liste — Anniversaire',
        occasion: 'Anniversaire',
        gifts: []
      },
      editToken: 'secret'
    }));
    sharedListService.getPublicUrl.and.returnValue('https://gift.example/liste/ma-liste-anniversaire');

    const component = new GiftPlannerComponent(plannerService, sharedListService);
    component.profile.occasion = 'anniversaire';
    component.selectedGifts = [{
      name: 'Un beau livre',
      description: 'Une édition illustrée',
      reason: 'Pour nourrir sa curiosité',
      budgetLabel: '30 à 50 €'
    }];

    component.shareDraft();
    expect(component.shareSlug).toBe('ma-liste-anniversaire');

    component.publishList();
    expect(sharedListService.createSharedList).toHaveBeenCalled();
    expect(component.publishedUrl).toBe('https://gift.example/liste/ma-liste-anniversaire');
    expect(component.currentSharedSlug).toBe('ma-liste-anniversaire');
  });
});
