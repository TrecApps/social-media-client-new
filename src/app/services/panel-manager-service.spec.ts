import { TestBed } from '@angular/core/testing';

import { PanelManagerService } from './panel-manager-service';

describe('PanelManagerService', () => {
  let service: PanelManagerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PanelManagerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
