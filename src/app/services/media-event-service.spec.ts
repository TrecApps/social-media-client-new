import { TestBed } from '@angular/core/testing';

import { MediaEventService } from './media-event-service';

describe('MediaEventService', () => {
  let service: MediaEventService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MediaEventService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
