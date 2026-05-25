import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImagePanelComponent } from './image-panel-component';

describe('ImagePanelComponent', () => {
  let component: ImagePanelComponent;
  let fixture: ComponentFixture<ImagePanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImagePanelComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ImagePanelComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
