import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditWork } from './edit-work';

describe('EditWork', () => {
  let component: EditWork;
  let fixture: ComponentFixture<EditWork>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditWork]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditWork);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
