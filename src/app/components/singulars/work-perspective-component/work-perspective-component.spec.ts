import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WorkPerspectiveComponent } from './work-perspective-component';

describe('WorkPerspectiveComponent', () => {
  let component: WorkPerspectiveComponent;
  let fixture: ComponentFixture<WorkPerspectiveComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkPerspectiveComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WorkPerspectiveComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
