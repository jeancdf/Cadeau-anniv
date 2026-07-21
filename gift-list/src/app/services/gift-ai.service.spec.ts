import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { GiftAiService } from './gift-ai.service';

describe('GiftAiService', () => {
  let service: GiftAiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(GiftAiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
