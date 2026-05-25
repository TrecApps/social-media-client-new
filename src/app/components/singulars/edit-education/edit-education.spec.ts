import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditEducation } from './edit-education';

describe('EditEducation', () => {
  let component: EditEducation;
  let fixture: ComponentFixture<EditEducation>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditEducation]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditEducation);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
