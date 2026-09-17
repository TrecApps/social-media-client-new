import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PanelManagerService } from '../../../services/panel-manager-service';
import { PanelEntry } from '../../../models/Messaging';
import { ChatPanelComponent } from '../../repeats/chat-panel-component/chat-panel-component';

/**
 * ChatPanelHostComponent
 *
 * Portal/overlay anchor that renders the set of open chat panels in a
 * fixed bottom-right row.
 *
 * Responsibilities:
 * - Renders up to 3 open panels from `PanelManagerService.openPanels` signal.
 * - Lays panels out horizontally, anchored to the bottom-right of the viewport.
 * - Panels are ordered so the most recently focused panel is rightmost
 *   (the signal already maintains this ordering).
 * - Visually distinguishes the Focused_Panel from non-focused panels.
 *
 * Note: The full `ChatPanelComponent` (task 11) is not yet implemented. Until it
 * exists, this host renders a lightweight placeholder for each open panel that is
 * bound to the `openPanels` signal. When `ChatPanelComponent` lands, its selector
 * (`<app-chat-panel [conversation]="entry.conversation" />`) replaces the placeholder
 * markup in the template `@for` block.
 *
 * Validates: Requirements 3.1, 3.2, 3.6
 */
@Component({
  selector: 'app-chat-panel-host-component',
  imports: [CommonModule, ChatPanelComponent],
  templateUrl: './chat-panel-host-component.html',
  styleUrl: './chat-panel-host-component.css',
})
export class ChatPanelHostComponent {
    protected readonly panelManager = inject(PanelManagerService);

  /**
   * The ordered list of currently open panels (rightmost = most recently focused).
   *
   * Validates: Requirements 3.1, 3.2
   */
  readonly openPanels = this.panelManager.openPanels;

  /**
   * Track function for the `@for` loop, keyed by conversation ID so panels are
   * not re-created when the list is reordered on focus change.
   */
  trackByConversationId(_index: number, entry: PanelEntry): string {
    return entry.conversation.id;
  }
}
