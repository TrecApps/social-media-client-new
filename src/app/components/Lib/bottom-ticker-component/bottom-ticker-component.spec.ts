import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BottomTickerComponent } from './bottom-ticker-component';

describe('BottomTickerComponent', () => {
  let component: BottomTickerComponent;
  let fixture: ComponentFixture<BottomTickerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BottomTickerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BottomTickerComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
