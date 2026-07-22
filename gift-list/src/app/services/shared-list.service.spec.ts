import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideLocationMocks } from '@angular/common/testing';
import { SharedListService } from './shared-list.service';
import { environment } from '../../environments/environment';

describe('SharedListService', () => {
  let service: SharedListService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideLocationMocks()]
    });
    service = TestBed.inject(SharedListService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('conserve le secret reçu à la création puis l’envoie lors de la mise à jour', () => {
    const payload = {
      title: 'Les cadeaux de Léa',
      occasion: 'Anniversaire',
      gifts: [{ name: 'Un beau livre', description: '', reason: '', budgetLabel: '30 €' }]
    };

    service.createSharedList({ ...payload, slug: 'lea-30-ans' }).subscribe();
    const createRequest = httpTesting.expectOne(`${environment.apiUrl}/shared-lists`);
    createRequest.flush({ list: { ...payload, slug: 'lea-30-ans' }, editToken: 'secret-prive' });

    expect(service.hasEditToken('lea-30-ans')).toBeTrue();

    service.updateSharedList('lea-30-ans', payload).subscribe();
    const updateRequest = httpTesting.expectOne(`${environment.apiUrl}/shared-lists/lea-30-ans`);
    expect(updateRequest.request.method).toBe('PUT');
    expect(updateRequest.request.headers.get('X-Edit-Token')).toBe('secret-prive');
    updateRequest.flush({ list: { ...payload, slug: 'lea-30-ans' } });
  });
});
