import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewProfileComponent } from './new-profile-component';

describe('NewProfileComponent', () => {
  let component: NewProfileComponent;
  let fixture: ComponentFixture<NewProfileComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewProfileComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(NewProfileComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
