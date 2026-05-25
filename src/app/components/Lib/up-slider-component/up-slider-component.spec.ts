import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UpSliderComponent } from './up-slider-component';

describe('UpSliderComponent', () => {
  let component: UpSliderComponent;
  let fixture: ComponentFixture<UpSliderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UpSliderComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(UpSliderComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
