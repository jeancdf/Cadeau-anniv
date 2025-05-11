import { TestBed } from '@angular/core/testing';

import { GiftAiService } from './gift-ai.service';

describe('GiftAiService', () => {
  let service: GiftAiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GiftAiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
