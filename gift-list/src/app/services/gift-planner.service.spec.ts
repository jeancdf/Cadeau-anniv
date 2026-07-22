import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { GiftPlannerService, PlannerGiftSuggestion } from './gift-planner.service';
import { environment } from '../../environments/environment';

describe('GiftPlannerService', () => {
  let service: GiftPlannerService;
  let httpTesting: HttpTestingController;

  const gift: PlannerGiftSuggestion = {
    name: 'Album photo',
    description: 'Un album personnalisé',
    reason: 'Pour conserver les souvenirs',
    budgetLabel: 'Environ 30 à 50 euros'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(GiftPlannerService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('should publish a public gift list snapshot', () => {
    service.publishList({
      occasion: 'Anniversaire',
      audienceLabel: 'Pour un proche',
      gifts: [gift]
    }).subscribe(response => expect(response.publicId).toBe('abc123456789_def'));

    const request = httpTesting.expectOne(`${environment.apiUrl}/shared-lists`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body.gifts).toEqual([gift]);
    request.flush({ publicId: 'abc123456789_def' });
  });

  it('should load a public list by its identifier', () => {
    service.getSharedList('abc123456789_def').subscribe();

    const request = httpTesting.expectOne(`${environment.apiUrl}/shared-lists/abc123456789_def`);
    expect(request.request.method).toBe('GET');
    request.flush({
      publicId: 'abc123456789_def',
      occasion: 'Anniversaire',
      audienceLabel: 'Pour un proche',
      gifts: [],
      createdAt: '2026-07-22T00:00:00.000Z'
    });
  });
});
