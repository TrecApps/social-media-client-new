import { TestBed } from '@angular/core/testing';

import { UrlRedirectService } from './url-redirect-service';

describe('UrlRedirectService', () => {
  let service: UrlRedirectService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UrlRedirectService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
