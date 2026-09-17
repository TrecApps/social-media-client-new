import { Injectable, signal, WritableSignal } from '@angular/core';
import { Conversation, PanelEntry } from '../models/Messaging';

/** Maximum number of panels that can be open simultaneously. */
const MAX_PANELS = 3;

@Injectable({
  providedIn: 'root',
})
export class PanelManagerService {
    /**
   * Ordered list of currently open panels.
   * The rightmost element (highest index) is the most recently focused / most recently opened panel.
   *
   * Validates: Requirements 3.1, 3.2
   */
  readonly openPanels: WritableSignal<PanelEntry[]> = signal<PanelEntry[]>([]);

  /**
   * Opens a panel for the given conversation.
   *
   * - Deduplication: if the conversation is already open, moves it to the rightmost
   *   position and makes it focused (no duplicate opened).
   * - LRU eviction: if MAX_PANELS panels are open and the conversation is not already
   *   open, evicts the panel with the oldest `lastInteractionTime` before opening.
   * - The newly opened / re-focused panel becomes the Focused_Panel (rightmost position).
   *
   * Validates: Requirements 3.1, 3.2, 3.3, 3.5
   */
  openPanel(conversation: Conversation): void {
    const current = this.openPanels();
    const existingIndex = current.findIndex(
      (p) => p.conversation.id === conversation.id
    );

    if (existingIndex !== -1) {
      // Conversation already open — move to rightmost and focus it.
      const existing = current[existingIndex];
      const updated: PanelEntry[] = [
        ...current.slice(0, existingIndex),
        ...current.slice(existingIndex + 1),
        { ...existing, isFocused: true, lastInteractionTime: new Date() },
      ].map((p, i, arr) => ({
        ...p,
        isFocused: i === arr.length - 1,
      }));
      this.openPanels.set(updated);
      return;
    }

    // New conversation — evict LRU if at capacity.
    let panels = [...current];
    if (panels.length >= MAX_PANELS) {
      panels = this._evictLru(panels);
    }

    // Append the new panel as the rightmost (focused) entry.
    const newEntry: PanelEntry = {
      conversation,
      lastInteractionTime: new Date(),
      isFocused: true,
    };

    const updated: PanelEntry[] = [
      ...panels.map((p) => ({ ...p, isFocused: false })),
      newEntry,
    ];

    this.openPanels.set(updated);
  }

  /**
   * Closes (removes) the panel for the given conversation ID.
   *
   * Validates: Requirements 3.4
   */
  closePanel(conversationId: string): void {
    this.openPanels.update((panels) =>
      panels.filter((p) => p.conversation.id !== conversationId)
    );
  }

  /**
   * Moves the panel for the given conversation ID to the rightmost position and
   * sets `isFocused = true` on it, clearing `isFocused` on all other panels.
   *
   * Validates: Requirements 3.6, 3.7
   */
  focusPanel(conversationId: string): void {
    const current = this.openPanels();
    const index = current.findIndex(
      (p) => p.conversation.id === conversationId
    );
    if (index === -1) {
      return; // Panel not found — no-op.
    }

    const target = current[index];
    const updated: PanelEntry[] = [
      ...current.slice(0, index),
      ...current.slice(index + 1),
      { ...target, isFocused: true },
    ].map((p, i, arr) => ({
      ...p,
      isFocused: i === arr.length - 1,
    }));

    this.openPanels.set(updated);
  }

  /**
   * Updates the `lastInteractionTime` of the panel with the given conversation ID
   * to the current timestamp.
   *
   * Validates: Requirements 3.3 (maintains accurate LRU data), 3.7
   */
  updateLastInteraction(conversationId: string): void {
    this.openPanels.update((panels) =>
      panels.map((p) =>
        p.conversation.id === conversationId
          ? { ...p, lastInteractionTime: new Date() }
          : p
      )
    );
  }

  // ── Private helpers ─────────────────────────────────────────────────────

  /**
   * Removes the panel with the oldest (minimum) `lastInteractionTime` from the list
   * and returns the resulting array.
   *
   * Validates: Requirements 3.3 (LRU eviction)
   */
  private _evictLru(panels: PanelEntry[]): PanelEntry[] {
    if (panels.length === 0) {
      return panels;
    }

    let lruIndex = 0;
    let lruTime = panels[0].lastInteractionTime.getTime();

    for (let i = 1; i < panels.length; i++) {
      const t = panels[i].lastInteractionTime.getTime();
      if (t < lruTime) {
        lruTime = t;
        lruIndex = i;
      }
    }

    return [...panels.slice(0, lruIndex), ...panels.slice(lruIndex + 1)];
  }
}
