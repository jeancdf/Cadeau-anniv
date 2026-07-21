import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { GiftService } from './gift.service';
import { environment } from '../../environments/environment';

describe('GiftService', () => {
  let service: GiftService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(GiftService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should send all priorities in one reorder request', () => {
    const priorities = [{ id: 'gift-1', priority: 0 }];

    service.reorderGifts(priorities).subscribe();

    const request = httpTesting.expectOne(`${environment.apiUrl}/gifts/reorder`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ priorities });
    request.flush({ message: 'ok' });
  });
});
