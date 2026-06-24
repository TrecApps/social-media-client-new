import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DuoContentComponent } from './duo-content-component';

describe('DuoContentComponent', () => {
  let component: DuoContentComponent;
  let fixture: ComponentFixture<DuoContentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DuoContentComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DuoContentComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
