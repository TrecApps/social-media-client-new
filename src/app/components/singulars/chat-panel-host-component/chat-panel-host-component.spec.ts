import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChatPanelHostComponent } from './chat-panel-host-component';

describe('ChatPanelHostComponent', () => {
  let component: ChatPanelHostComponent;
  let fixture: ComponentFixture<ChatPanelHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatPanelHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ChatPanelHostComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
