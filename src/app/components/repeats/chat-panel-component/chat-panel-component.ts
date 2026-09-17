import {
  Component,
  Input,
  OnInit,
  OnChanges,
  OnDestroy,
  AfterViewChecked,
  SimpleChanges,
  ElementRef,
  ViewChild,
  signal,
  WritableSignal,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { MessagingService } from '../../../services/messaging-service';
import { PanelManagerService } from '../../../services/panel-manager-service';
import { AuthService } from '../../../services/auth-service';
import { RelativeTimePipe } from '../../../pipes/relative-time-pipe';
import {
  Conversation,
  Message,
  EditState,
  ConversationEvent,
  aggregateReactions,
} from '../../../models/Messaging';

/**
 * ChatPanelComponent
 *
 * A floating chat panel that displays a conversation's message history and
 * connects it to the backend via REST (initial + paginated loads) and STOMP
 * (subscription lifecycle). This is the core scaffold (task 11.1) responsible
 * for:
 * - Loading the first page of messages on open and subscribing to live updates.
 * - Unsubscribing on destroy.
 * - Displaying messages in chronological order (oldest at top, newest at bottom).
 * - Paginating older messages when the user scrolls to the top.
 * - Tracking user interactions (click, scroll, keydown) for LRU eviction / focus.
 * - Providing a close button that closes the panel and unsubscribes.
 * - Distinguishing the focused panel via the header.
 *
 * Send / edit / react / mark-seen (tasks 12.x) and WebSocket event handlers
 * (tasks 13.x) are layered on top of this scaffold. The WebSocket handlers
 * subscribe to `WebSocketService.eventsFor(conversationId)` and dispatch each
 * `ConversationEvent` by its `eventType`:
 * - NEW_MESSAGE: append + auto-scroll / unread-badge logic.
 * - MESSAGE_SEEN: record actor seen state for read-receipt display.
 * - MESSAGE_REACTION / MESSAGE_EDIT: replace the matching message in place.
 *
 * Validates: Requirements 3.4, 3.6, 3.7, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7,
 *            7.1, 7.2, 7.3, 7.4, 7.5, 8.1, 8.2, 8.3, 9.1, 9.3, 10.1, 10.3
 */
@Component({
  selector: 'app-chat-panel-component',
  imports: [CommonModule, RelativeTimePipe],
  templateUrl: './chat-panel-component.html',
  styleUrl: './chat-panel-component.css',
})
export class ChatPanelComponent {
  private readonly messagingService = inject(MessagingService);
  private readonly panelManager = inject(PanelManagerService);
  private readonly authService = inject(AuthService);

  /**
   * The conversation this panel displays. Required input supplied by
   * `ChatPanelHostComponent`.
   */
  @Input({ required: true }) conversation!: Conversation;

  /**
   * Whether this panel is currently the Focused_Panel. Supplied by the host from
   * the `PanelManagerService.openPanels` entry.
   *
   * Validates: Requirements 3.6
   */
  @Input() isFocused = false;

  /** Reference to the scrollable message list container for scroll/pagination. */
  @ViewChild('messageList') messageListRef?: ElementRef<HTMLDivElement>;

  /** Reference to the compose text input for focus management. */
  @ViewChild('composeInput') composeInputRef?: ElementRef<HTMLTextAreaElement>;

  // ── State signals ────────────────────────────────────────────────────────

  /**
   * Displayed messages in chronological order (oldest first, newest last).
   *
   * Validates: Requirements 4.3
   */
  readonly messages: WritableSignal<Message[]> = signal<Message[]>([]);

  /**
   * True while the initial page-0 message load is in-flight.
   *
   * Validates: Requirements 4.2
   */
  readonly loadingMessages: WritableSignal<boolean> = signal(false);

  /**
   * True while an additional (older) page is loading.
   *
   * Validates: Requirements 4.5
   */
  readonly loadingMore: WritableSignal<boolean> = signal(false);

  /**
   * Inline error message for a failed message-history fetch (initial or paginated).
   *
   * Validates: Requirements 4.7
   */
  readonly loadError: WritableSignal<string | null> = signal(null);

  /**
   * Inline error message for a failed send (populated by task 12.1).
   */
  readonly sendError: WritableSignal<string | null> = signal(null);

  /** True while a send request is in-flight. */
  readonly sendPending: WritableSignal<boolean> = signal(false);

  /**
   * The current compose draft text. Retained on send failure so the user can
   * retry, cleared on send success.
   *
   * Validates: Requirements 11.3, 11.4
   */
  readonly draft: WritableSignal<string> = signal('');

  /**
   * Inline validation message shown when the user attempts to submit an
   * empty/whitespace-only message.
   *
   * Validates: Requirements 11.6
   */
  readonly sendValidationError: WritableSignal<string | null> = signal(null);

  /** Tracks which message is being edited and its draft (task 12.4). */
  readonly editState: WritableSignal<EditState | null> = signal<EditState | null>(null);

  /** True while an edit (PUT) request is in-flight. The confirm affordance is disabled meanwhile. */
  readonly editPending: WritableSignal<boolean> = signal(false);

  /**
   * Inline error shown within the edit field on a failed edit. Cleared on retry
   * and when leaving edit mode.
   *
   * Validates: Requirements 14.6
   */
  readonly editError: WritableSignal<string | null> = signal(null);

  /**
   * Inline validation message shown when the user attempts to confirm an edit
   * with an empty/whitespace-only body.
   *
   * Validates: Requirements 14.4
   */
  readonly editValidationError: WritableSignal<string | null> = signal(null);

  /** Count of unread new messages when scrolled away from bottom (populated by task 13.1). */
  readonly unreadBadgeCount: WritableSignal<number> = signal(0);

  /**
   * The fixed set of emoji offered by the reaction picker affordance.
   *
   * Validates: Requirements 13.1
   */
  readonly reactionOptions: readonly string[] = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

  /**
   * Ids of messages whose reaction picker is currently open (hover/tap
   * activated). Kept as a set-backed signal so the template can toggle a single
   * message's picker without affecting others.
   *
   * Validates: Requirements 13.1
   */
  readonly openReactionPickerIds: WritableSignal<Set<string>> = signal(new Set<string>());

  /**
   * Ids of messages that currently have an in-flight react request. The
   * affordance is disabled for these messages to prevent duplicate submissions.
   *
   * Validates: Requirements 13.3
   */
  readonly reactionPendingIds: WritableSignal<Set<string>> = signal(new Set<string>());

  /**
   * Per-message inline reaction error messages, keyed by message id. Populated
   * on a failed react request and cleared on retry/success.
   *
   * Validates: Requirements 13.4
   */
  readonly reactionErrors: WritableSignal<Map<string, string>> = signal(new Map<string, string>());

  /**
   * The lowest page index currently loaded. Starts at 0 after the initial load.
   * The top pagination trigger is hidden when this equals 0.
   *
   * Validates: Requirements 4.4, 4.6
   */
  readonly lowestLoadedPage: WritableSignal<number> = signal(0);

  /**
   * Timestamp of the most recent user interaction with this panel. Kept in sync
   * with `PanelManagerService` for LRU eviction.
   *
   * Validates: Requirements 3.3, 3.7
   */
  readonly lastInteractionTime: WritableSignal<Date> = signal(new Date());

  // ── Internal state ───────────────────────────────────────────────────────

  private _initialSub: Subscription | null = null;
  private _moreSub: Subscription | null = null;
  private _eventsSub: Subscription | null = null;
  private _sendSub: Subscription | null = null;
  private _editSub: Subscription | null = null;
  private _markSeenSub: Subscription | null = null;
  private readonly _reactSubs = new Map<string, Subscription>();

  /** True while a mark-seen request is in-flight, to avoid overlapping calls. */
  private _markSeenPending = false;

  /** True when a scroll-to-bottom should occur after the next view check. */
  private _scrollToBottomPending = false;

  /**
   * Height of the scroll content before a prepend, so scroll position can be
   * preserved after older messages are prepended at the top.
   */
  private _prependAnchorHeight: number | null = null;

  // ── Convenience ──────────────────────────────────────────────────────────

  get conversationId(): string {
    return this.conversation.id;
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────

  ngOnInit(): void {
    // Subscribe to live updates for this conversation.
    //
    // Validates: Requirements 6.1 (subscription happens on open)
    this.messagingService.subscribe(this.conversationId);

    // Listen for ConversationEvents delivered for this conversation and dispatch
    // each by its `eventType` to the appropriate handler.
    //
    // Validates: Requirements 7.1, 7.2, 8.1, 8.3, 9.1, 9.3, 10.1, 10.3
    this._eventsSub = this.messagingService.eventsFor(this.conversationId).subscribe({
      next: (event) => this._dispatchEvent(event),
      error: (err: unknown) => {
        // A subscription-failure error is surfaced through this stream; log it
        // without disturbing the displayed message list.
        console.error(
          `[ChatPanel] Event stream error for ${this.conversationId}:`,
          err
        );
      },
    });

    // Load the first page of messages.
    //
    // Validates: Requirements 4.1
    this._loadInitialMessages();
  }

  /**
   * Dispatches an incoming `ConversationEvent` to the handler matching its
   * `eventType`. Unknown event types are logged and ignored.
   *
   * Validates: Requirements 7.1, 8.1, 9.1, 10.1
   */
  private _dispatchEvent(event: ConversationEvent): void {
    switch (event.eventType) {
      case 'NEW_MESSAGE':
        this._handleNewMessage(event);
        break;
      case 'MESSAGE_SEEN':
        this._handleSeen(event);
        break;
      case 'MESSAGE_REACTION':
        this._handleReaction(event);
        break;
      case 'MESSAGE_EDIT':
        this._handleEdit(event);
        break;
      default:
        console.warn(
          `[ChatPanel] Unknown event type for ${this.conversationId}:`,
          (event as ConversationEvent).eventType
        );
    }
  }

  /**
   * Detects when this panel transitions into the Focused_Panel and, on that
   * transition, marks all currently-displayed messages that the authenticated
   * user has not yet seen as seen in a single request.
   *
   * Validates: Requirements 12.1
   */
  ngOnChanges(changes: SimpleChanges): void {
    const focusChange = changes['isFocused'];
    if (
      focusChange &&
      !focusChange.firstChange &&
      focusChange.previousValue === false &&
      focusChange.currentValue === true
    ) {
      this._markSeenForUnseen();
    }
  }

  ngOnDestroy(): void {
    this._initialSub?.unsubscribe();
    this._moreSub?.unsubscribe();
    this._eventsSub?.unsubscribe();
    this._sendSub?.unsubscribe();
    this._editSub?.unsubscribe();
    this._markSeenSub?.unsubscribe();
    this._reactSubs.forEach((sub) => sub.unsubscribe());
    this._reactSubs.clear();

    // Unsubscribe from live updates for this conversation.
    //
    // Validates: Requirements 3.4, 6.2
    this.messagingService.unsubscribe(this.conversationId);
  }

  ngAfterViewChecked(): void {
    // Apply a pending scroll-to-bottom (e.g., after initial load) once the DOM
    // has rendered the messages.
    if (this._scrollToBottomPending) {
      this._scrollToBottomPending = false;
      this._scrollToBottom();
    }

    // Preserve scroll position after prepending older messages so the viewport
    // does not jump.
    if (this._prependAnchorHeight !== null && this.messageListRef) {
      const el = this.messageListRef.nativeElement;
      const delta = el.scrollHeight - this._prependAnchorHeight;
      el.scrollTop = el.scrollTop + delta;
      this._prependAnchorHeight = null;
    }
  }

  // ── Interaction tracking ─────────────────────────────────────────────────

  /**
   * Records a user interaction with the panel, updating both local and
   * PanelManager last-interaction timestamps, and focusing the panel.
   *
   * Validates: Requirements 3.7
   */
  onInteract(): void {
    this.lastInteractionTime.set(new Date());
    this.panelManager.updateLastInteraction(this.conversationId);
  }

  /**
   * Handler for clicks anywhere in the panel (including the header). Focuses the
   * panel and records the interaction.
   *
   * Validates: Requirements 3.6, 3.7
   */
  onPanelClick(): void {
    this.panelManager.focusPanel(this.conversationId);
    this.onInteract();
  }

  /**
   * Handler for keydown events within the panel.
   *
   * Validates: Requirements 3.7
   */
  onKeydown(): void {
    this.onInteract();
  }

  /**
   * Scroll handler for the message list. Records the interaction and triggers
   * pagination when the user reaches the top.
   *
   * Validates: Requirements 3.7, 4.4
   */
  onScroll(): void {
    this.onInteract();

    const el = this.messageListRef?.nativeElement;
    if (!el) return;

    // Trigger pagination when scrolled to (or near) the top and there are older
    // pages to load.
    //
    // Validates: Requirements 4.4, 4.6
    if (el.scrollTop <= 0 && this.lowestLoadedPage() > 0 && !this.loadingMore()) {
      this._loadMoreMessages();
    }
  }

  // ── Close ────────────────────────────────────────────────────────────────

  /**
   * Closes this panel: removes it from the panel manager and unsubscribes from
   * live updates.
   *
   * Validates: Requirements 3.4
   */
  close(): void {
    this.panelManager.closePanel(this.conversationId);
    this.messagingService.unsubscribe(this.conversationId);
  }

  // ── Unread badge ─────────────────────────────────────────────────────────

  /**
   * Handles a click on the unread-message notification badge: scrolls to the
   * bottom of the message list and resets the unread count to zero.
   *
   * Validates: Requirements 7.5
   */
  onUnreadBadgeClick(): void {
    this.onInteract();
    this.unreadBadgeCount.set(0);
    // Defer the scroll so it runs after any pending change detection.
    this._scrollToBottomPending = true;
    this._scrollToBottom();
  }

  // ── Send ─────────────────────────────────────────────────────────────────

  /**
   * Updates the compose draft as the user types and clears any prior validation
   * message once they resume typing.
   */
  onDraftInput(value: string): void {
    this.draft.set(value);
    if (value.trim().length > 0) {
      this.sendValidationError.set(null);
    }
  }

  /**
   * Handles Enter in the compose input. Plain Enter submits; Shift+Enter inserts
   * a newline (default behaviour, not intercepted).
   *
   * Validates: Requirements 11.2
   */
  onComposeKeydown(event: KeyboardEvent): void {
    this.onInteract();
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  /**
   * Sends the current draft message.
   *
   * Trims the draft; if empty, shows a validation message and retains input
   * focus without calling the API. Otherwise disables the input/button while the
   * request is in-flight, clears the input on success, and shows an inline error
   * (retaining the draft) on failure.
   *
   * Validates: Requirements 11.2, 11.3, 11.4, 11.5, 11.6
   */
  send(): void {
    // Prevent duplicate submissions while a send is in-flight.
    //
    // Validates: Requirements 11.5
    if (this.sendPending()) return;

    const trimmed = this.draft().trim();

    // Whitespace-only / empty content must never trigger a POST.
    //
    // Validates: Requirements 11.6 (Property 15)
    if (trimmed.length === 0) {
      this.sendValidationError.set('Enter a message before sending.');
      this._focusComposeInput();
      return;
    }

    this.sendValidationError.set(null);
    this.sendError.set(null);
    this.sendPending.set(true);

    // POST the trimmed body.
    //
    // Validates: Requirements 11.2 (Property 15)
    this._sendSub?.unsubscribe();
    this._sendSub = this.messagingService
      .sendMessage(this.conversationId, trimmed)
      .subscribe({
        next: () => {
          // Clear the input on success. The new message is rendered when the
          // NEW_MESSAGE WebSocket event arrives (task 13.x).
          //
          // Validates: Requirements 11.3
          this.draft.set('');
          this.sendPending.set(false);
          this._focusComposeInput();
        },
        error: (err: unknown) => {
          // Show inline error and retain the draft so the user can retry.
          //
          // Validates: Requirements 11.4
          this.sendError.set(this._errorMessage(err, 'Failed to send message.'));
          this.sendPending.set(false);
          this._focusComposeInput();
        },
      });
  }

  private _focusComposeInput(): void {
    // Defer focus so it applies after the current change-detection cycle
    // re-enables the (previously disabled) input.
    queueMicrotask(() => this.composeInputRef?.nativeElement.focus());
  }

  // ── Edit ─────────────────────────────────────────────────────────────────

  /**
   * Whether the given message was authored by the authenticated user. The edit
   * affordance is rendered exclusively for messages where this is true.
   *
   * Validates: Requirements 14.1 (Property 18)
   */
  canEditMessage(message: Message): boolean {
    const profileId = this.authService.currentAccountId;
    return !!profileId && message.profile === profileId;
  }

  /**
   * Whether the given message is currently in edit mode.
   *
   * Validates: Requirements 14.2
   */
  isEditing(messageId: string): boolean {
    return this.editState()?.messageId === messageId;
  }

  /**
   * Whether the "edited" indicator should be shown for the given message. It is
   * visible exactly when the message has more than one version.
   *
   * Validates: Requirements 10.2, 14 (Property 14)
   */
  isEdited(message: Message): boolean {
    return message.messageVersions.length > 1;
  }

  /**
   * Activates edit mode for a message, pre-filling the editable field with the
   * text from the most recent entry in the message's `messageVersions` array.
   * Guarded by authorship so only the author can enter edit mode.
   *
   * Validates: Requirements 14.1, 14.2 (Property 18)
   */
  startEdit(message: Message): void {
    this.onInteract();
    if (!this.canEditMessage(message)) return;

    const versions = message.messageVersions;
    const prefill = versions.length > 0 ? versions[versions.length - 1].message : '';

    this.editError.set(null);
    this.editValidationError.set(null);
    this.editPending.set(false);
    this.editState.set({ messageId: message.id, draft: prefill });
  }

  /**
   * Updates the in-progress edit draft as the user types and clears any prior
   * validation message once the field has non-whitespace content.
   */
  onEditInput(value: string): void {
    const current = this.editState();
    if (!current) return;
    this.editState.set({ ...current, draft: value });
    if (value.trim().length > 0) {
      this.editValidationError.set(null);
    }
  }

  /**
   * Handles keydown within the edit field. Plain Enter confirms the edit;
   * Shift+Enter inserts a newline; Escape cancels.
   *
   * Validates: Requirements 14.3, 14.7
   */
  onEditKeydown(event: KeyboardEvent): void {
    this.onInteract();
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.confirmEdit();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.cancelEdit();
    }
  }

  /**
   * Confirms the in-progress edit.
   *
   * Trims the edited text; if empty, shows an inline validation error and does
   * NOT call the API. Otherwise disables the confirm affordance while the
   * request is in-flight and calls `MessagingService.editMessage`. On success
   * edit mode is exited (the updated content arrives via the MESSAGE_EDIT
   * WebSocket event). On failure the panel stays in edit mode, shows an inline
   * error, and retains the edited draft so the user can retry.
   *
   * Validates: Requirements 14.3, 14.4, 14.5, 14.6 (Property 19)
   */
  confirmEdit(): void {
    const current = this.editState();
    if (!current) return;

    // Prevent duplicate submissions while an edit is in-flight.
    if (this.editPending()) return;

    const trimmed = current.draft.trim();

    // Empty / whitespace-only body must never trigger a PUT.
    //
    // Validates: Requirements 14.4 (Property 19)
    if (trimmed.length === 0) {
      this.editValidationError.set('Message cannot be empty.');
      return;
    }

    this.editValidationError.set(null);
    this.editError.set(null);
    this.editPending.set(true);

    // PUT the trimmed body.
    //
    // Validates: Requirements 14.3 (Property 19)
    this._editSub?.unsubscribe();
    this._editSub = this.messagingService
      .editMessage(current.messageId, trimmed)
      .subscribe({
        next: () => {
          // Exit edit mode on success. The updated message content arrives via
          // the MESSAGE_EDIT WebSocket event (task 13.2), so the local message
          // list is not mutated here.
          //
          // Validates: Requirements 14.5
          this.editPending.set(false);
          this.editState.set(null);
          this.editError.set(null);
          this.editValidationError.set(null);
        },
        error: (err: unknown) => {
          // Stay in edit mode, show an inline error, and retain the draft.
          //
          // Validates: Requirements 14.6
          this.editPending.set(false);
          this.editError.set(this._errorMessage(err, 'Failed to edit message.'));
        },
      });
  }

  /**
   * Cancels the in-progress edit, exiting edit mode and restoring the original
   * message display without calling the API.
   *
   * Validates: Requirements 14.7
   */
  cancelEdit(): void {
    this.onInteract();
    // No API call — simply discard the in-progress edit.
    this._editSub?.unsubscribe();
    this.editState.set(null);
    this.editPending.set(false);
    this.editError.set(null);
    this.editValidationError.set(null);
  }

  // ── Mark seen ──────────────────────────────────────────────────────────────

  /**
   * Determines whether the authenticated user has already seen the given
   * message. Seen state is tracked in the backend `reactions` map: every
   * participant has an entry keyed by their profile id, and the `seen`
   * timestamp is populated once they have viewed the message. A message is
   * therefore considered *unseen* by the current user when their reaction entry
   * is missing or its `seen` timestamp is absent.
   *
   * Validates: Requirements 12.1, 8.2
   */
  private _isSeenByCurrentUser(message: Message): boolean {
    const profileId = this.authService.currentAccountId;
    if (!profileId) return true; // Without an identity we cannot mark anything as unseen.
    const reaction = message.reactions?.[profileId];
    return !!reaction && !!reaction.seen;
  }

  /**
   * Computes the ids of all displayed messages that the authenticated user has
   * not yet seen.
   *
   * Validates: Requirements 12.1 (Property 16)
   */
  private _computeUnseenIds(): string[] {
    return this.messages()
      .filter((m) => !this._isSeenByCurrentUser(m))
      .map((m) => m.id);
  }

  /**
   * Marks all currently-displayed unseen messages as seen in a single request.
   * No request is issued when there are no unseen messages.
   *
   * Validates: Requirements 12.1 (Property 16)
   */
  private _markSeenForUnseen(): void {
    this.markMessagesSeen(this._computeUnseenIds());
  }

  /**
   * Sends a single `PATCH /Messages/seen` request for the provided message ids
   * and, only on a successful response, updates the local seen indicators. On
   * failure the error is logged and local seen state is left unchanged so a
   * later attempt can retry.
   *
   * This method is intentionally reusable so the `NEW_MESSAGE` handler (task
   * 13.1) can enqueue a newly-arrived message id while the panel is focused.
   *
   * Validates: Requirements 12.1, 12.2, 12.3 (Property 16)
   */
  markMessagesSeen(messageIds: string[]): void {
    // De-duplicate while preserving order; skip when nothing is unseen.
    const ids = Array.from(new Set(messageIds));
    if (ids.length === 0 || this._markSeenPending) return;

    this._markSeenPending = true;
    this._markSeenSub?.unsubscribe();
    this._markSeenSub = this.messagingService.markSeen(ids).subscribe({
      next: () => {
        // Only now — after a successful response — update local seen indicators.
        //
        // Validates: Requirements 12.3
        this._applyLocalSeen(ids);
        this._markSeenPending = false;
      },
      error: (err: unknown) => {
        // Log the error and leave local seen indicators untouched so a
        // subsequent focus/new-message can retry.
        //
        // Validates: Requirements 12.3
        console.error('Failed to mark messages as seen', err);
        this._markSeenPending = false;
      },
    });
  }

  /**
   * Applies the seen state locally for the given message ids by populating the
   * authenticated user's reaction `seen` timestamp. Messages not in the id set
   * are left unchanged.
   *
   * Validates: Requirements 12.3
   */
  private _applyLocalSeen(ids: string[]): void {
    const profileId = this.authService.currentAccountId;
    if (!profileId) return;
    const idSet = new Set(ids);
    const now = new Date().toISOString();

    this.messages.update((current) =>
      current.map((m) => {
        if (!idSet.has(m.id)) return m;
        const existing = m.reactions?.[profileId];
        if (existing && existing.seen) return m; // already seen locally
        return {
          ...m,
          reactions: {
            ...m.reactions,
            [profileId]: {
              reaction: existing?.reaction ?? '',
              seen: now,
            },
          },
        };
      })
    );
  }

  // ── React ──────────────────────────────────────────────────────────────────

  /**
   * Whether the reaction picker for the given message is currently open.
   *
   * Validates: Requirements 13.1
   */
  isReactionPickerOpen(messageId: string): boolean {
    return this.openReactionPickerIds().has(messageId);
  }

  /**
   * Whether a react request for the given message is in-flight; the affordance
   * is disabled while this is true.
   *
   * Validates: Requirements 13.3
   */
  isReactionPending(messageId: string): boolean {
    return this.reactionPendingIds().has(messageId);
  }

  /** The inline reaction error for the given message, if any. */
  reactionError(messageId: string): string | null {
    return this.reactionErrors().get(messageId) ?? null;
  }

  /**
   * Opens (or, when already open, closes) the reaction picker for a message.
   * Opening is suppressed while a react request for that message is in-flight so
   * the user cannot queue duplicate submissions.
   *
   * Validates: Requirements 13.1, 13.3
   */
  toggleReactionPicker(messageId: string): void {
    this.onInteract();
    if (this.isReactionPending(messageId)) return;
    this.openReactionPickerIds.update((current) => {
      const next = new Set(current);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      return next;
    });
  }

  /**
   * Computes the aggregated per-emoji reaction counts for a message, excluding
   * the empty-string entries used purely for seen-tracking. Returns the counts
   * as an array of `{ emoji, count }` for template iteration; an empty array
   * means the reaction section is not rendered.
   *
   * Validates: Requirements 9.2 (Property 13)
   */
  reactionCounts(message: Message): { emoji: string; count: number }[] {
    const counts = aggregateReactions(message.reactions ?? {});
    const result: { emoji: string; count: number }[] = [];
    for (const [emoji, count] of counts) {
      // Seen-tracking entries carry an empty reaction string; they are not
      // displayable reactions.
      if (emoji !== '') {
        result.push({ emoji, count });
      }
    }
    return result;
  }

  /**
   * Reacts to a message with the selected emoji.
   *
   * Disables the affordance for that message while the request is in-flight to
   * prevent duplicate submissions. On success the picker closes; the updated
   * reactions arrive via the `MESSAGE_REACTION` WebSocket event (task 13.2), so
   * the local message list is not mutated here. On failure the affordance is
   * re-enabled and an inline error is shown for that message while existing
   * reactions are left unchanged.
   *
   * Validates: Requirements 13.2, 13.3, 13.4 (Property 17)
   */
  react(messageId: string, emoji: string): void {
    this.onInteract();

    // Prevent duplicate submissions while a react is in-flight for this message.
    //
    // Validates: Requirements 13.3
    if (this.isReactionPending(messageId)) return;

    this._setReactionError(messageId, null);
    this._setReactionPending(messageId, true);

    // Close the picker now that a selection has been made.
    this.openReactionPickerIds.update((current) => {
      if (!current.has(messageId)) return current;
      const next = new Set(current);
      next.delete(messageId);
      return next;
    });

    this._reactSubs.get(messageId)?.unsubscribe();

    // Call the API with exactly the given messageId and emoji.
    //
    // Validates: Requirements 13.2 (Property 17)
    const sub = this.messagingService.reactToMessage(messageId, emoji).subscribe({
      next: () => {
        // Success: the updated reactions arrive via the MESSAGE_REACTION
        // WebSocket event, so no local mutation is needed here.
        this._setReactionPending(messageId, false);
        this._reactSubs.delete(messageId);
      },
      error: (err: unknown) => {
        // Re-enable the affordance and surface an inline error; existing
        // reactions on the message are left unchanged.
        //
        // Validates: Requirements 13.4
        this._setReactionPending(messageId, false);
        this._setReactionError(
          messageId,
          this._errorMessage(err, 'Failed to add reaction.')
        );
        this._reactSubs.delete(messageId);
      },
    });
    this._reactSubs.set(messageId, sub);
  }

  private _setReactionPending(messageId: string, pending: boolean): void {
    this.reactionPendingIds.update((current) => {
      const next = new Set(current);
      if (pending) {
        next.add(messageId);
      } else {
        next.delete(messageId);
      }
      return next;
    });
  }

  private _setReactionError(messageId: string, message: string | null): void {
    this.reactionErrors.update((current) => {
      const next = new Map(current);
      if (message === null) {
        next.delete(messageId);
      } else {
        next.set(messageId, message);
      }
      return next;
    });
  }

  // ── WebSocket event handlers ─────────────────────────────────────────────

  /**
   * Handles a `NEW_MESSAGE` event.
   *
   * When the payload is a valid `Message`, it is appended to the END of the
   * message list, preserving the order of existing messages. If the user's
   * scroll position is within 100 px of the bottom, the view auto-scrolls to
   * reveal the new message; otherwise the unread badge count is incremented and
   * no auto-scroll occurs. When the panel is currently focused, the new message
   * id is additionally enqueued for a mark-seen request. Invalid payloads are
   * logged and leave the message list unchanged.
   *
   * Validates: Requirements 7.1, 7.2, 7.3, 7.4 (Property 8), 12.2
   */
  private _handleNewMessage(event: ConversationEvent): void {
    const message = this._asMessage(event.payload);
    if (!message) {
      // Absent or unparseable payload: log and do not modify the list.
      //
      // Validates: Requirements 7.2
      console.error(
        `[ChatPanel] NEW_MESSAGE with invalid payload for ${this.conversationId}:`,
        event.payload
      );
      return;
    }

    // Determine whether the user is near the bottom BEFORE appending, so the
    // decision reflects the pre-append scroll position.
    const nearBottom = this._isNearBottom();

    // Append to the end, preserving existing order.
    //
    // Validates: Requirements 7.1 (Property 8)
    this.messages.update((current) => [...current, message]);

    if (nearBottom) {
      // Auto-scroll to reveal the newly appended message.
      //
      // Validates: Requirements 7.3
      this._scrollToBottomPending = true;
    } else {
      // Show the unread badge instead of scrolling.
      //
      // Validates: Requirements 7.4
      this.unreadBadgeCount.update((c) => c + 1);
    }

    // If this panel is focused, include the new message in a mark-seen request.
    //
    // Validates: Requirements 12.2
    if (this.isFocused && !this._isSeenByCurrentUser(message)) {
      this.markMessagesSeen([message.id]);
    }
  }

  /**
   * Handles a `MESSAGE_SEEN` event.
   *
   * The payload is a list of message ids that the event's actor has seen. For
   * each displayed message whose id appears in the list, the actor's seen state
   * is recorded so the read-receipt indicator can reflect it. Messages not in
   * the list are left unchanged. Invalid payloads are logged and ignored.
   *
   * Validates: Requirements 8.1, 8.2, 8.3 (Property 10, 11)
   */
  private _handleSeen(event: ConversationEvent): void {
    const ids = this._asStringList(event.payload);
    if (!ids) {
      // Absent or unparseable payload: log and do not modify seen indicators.
      //
      // Validates: Requirements 8.3
      console.error(
        `[ChatPanel] MESSAGE_SEEN with invalid payload for ${this.conversationId}:`,
        event.payload
      );
      return;
    }

    const actorProfileId = event.actorProfileId;
    if (!actorProfileId) {
      console.error(
        `[ChatPanel] MESSAGE_SEEN missing actorProfileId for ${this.conversationId}`
      );
      return;
    }

    const idSet = new Set(ids);
    const now = new Date().toISOString();

    // Record the actor's seen state on each matching displayed message.
    //
    // Validates: Requirements 8.1 (Property 10)
    this.messages.update((current) =>
      current.map((m) => {
        if (!idSet.has(m.id)) return m; // unchanged
        const existing = m.reactions?.[actorProfileId];
        if (existing && existing.seen) return m; // already marked seen by actor
        return {
          ...m,
          reactions: {
            ...m.reactions,
            [actorProfileId]: {
              reaction: existing?.reaction ?? '',
              seen: now,
            },
          },
        };
      })
    );
  }

  /**
   * Handles a `MESSAGE_REACTION` event.
   *
   * The payload is an updated `Message`. The displayed message with the same
   * `id` is replaced in place, preserving its position; all other messages are
   * left unmodified. If the payload is missing or has no matching displayed
   * message, the error is logged and the list is unchanged.
   *
   * Validates: Requirements 9.1, 9.3 (Property 12)
   */
  private _handleReaction(event: ConversationEvent): void {
    this._replaceMessage(event, 'MESSAGE_REACTION');
  }

  /**
   * Handles a `MESSAGE_EDIT` event.
   *
   * The payload is an updated `Message`. The displayed message with the same
   * `id` is replaced in place, preserving its position; all other messages are
   * left unmodified. The "edited" indicator is derived from the updated
   * message's `messageVersions` length (see `isEdited`). If the payload is
   * missing or has no matching displayed message, the error is logged and the
   * list is unchanged.
   *
   * Validates: Requirements 10.1, 10.3 (Property 12)
   */
  private _handleEdit(event: ConversationEvent): void {
    this._replaceMessage(event, 'MESSAGE_EDIT');
  }

  /**
   * Shared implementation for `MESSAGE_REACTION` / `MESSAGE_EDIT`: replaces the
   * displayed message whose `id` matches the updated `Message` in the payload,
   * preserving position and leaving all others unmodified. Logs and skips when
   * the payload is missing/invalid or no matching message is displayed.
   *
   * Validates: Requirements 9.1, 9.3, 10.1, 10.3 (Property 12)
   */
  private _replaceMessage(event: ConversationEvent, label: string): void {
    const updated = this._asMessage(event.payload);
    if (!updated) {
      // Absent or unparseable payload: log and do not modify the list.
      //
      // Validates: Requirements 9.3, 10.3
      console.error(
        `[ChatPanel] ${label} with invalid payload for ${this.conversationId}:`,
        event.payload
      );
      return;
    }

    const idx = this.messages().findIndex((m) => m.id === updated.id);
    if (idx === -1) {
      // No matching displayed message: log and leave the list unchanged.
      //
      // Validates: Requirements 9.3, 10.3
      console.error(
        `[ChatPanel] ${label} for unknown message id ${updated.id} in ${this.conversationId}`
      );
      return;
    }

    // Replace at the same position, preserving all other messages.
    //
    // Validates: Requirements 9.1, 10.1 (Property 12)
    this.messages.update((current) =>
      current.map((m, i) => (i === idx ? updated : m))
    );
  }

  // ── Read receipts ────────────────────────────────────────────────────────

  /**
   * Whether a read-receipt indicator should be displayed beneath the given
   * message. It is shown when the message's seen state includes at least one
   * profile id that is NOT the authenticated user's own profile id.
   *
   * Seen state is tracked in the backend `reactions` map: a participant's entry
   * carries a `seen` timestamp once they have viewed the message.
   *
   * Validates: Requirements 8.2 (Property 11)
   */
  hasReadReceipt(message: Message): boolean {
    const ownProfileId = this.authService.currentAccountId;
    const reactions = message.reactions ?? {};
    for (const [profileId, reaction] of Object.entries(reactions)) {
      if (profileId !== ownProfileId && reaction && reaction.seen) {
        return true;
      }
    }
    return false;
  }

  // ── Private — event payload parsing ──────────────────────────────────────

  /**
   * Narrows an event payload to a valid `Message`, or returns `null` when the
   * payload is absent or does not have the shape of a `Message`.
   */
  private _asMessage(payload: ConversationEvent['payload']): Message | null {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return null;
    }
    const candidate = payload as Partial<Message>;
    if (
      typeof candidate.id !== 'string' ||
      typeof candidate.conversationId !== 'string' ||
      typeof candidate.profile !== 'string' ||
      !Array.isArray(candidate.messageVersions)
    ) {
      return null;
    }
    return payload as Message;
  }

  /**
   * Narrows an event payload to a list of string message ids, or returns `null`
   * when the payload is absent or is not an array of strings.
   */
  private _asStringList(payload: ConversationEvent['payload']): string[] | null {
    if (!Array.isArray(payload)) return null;
    if (!payload.every((item) => typeof item === 'string')) return null;
    return payload as string[];
  }

  /**
   * Whether the message list is scrolled to within 100 px of the bottom. When
   * the list element is unavailable (e.g., before first render) this returns
   * `true` so freshly-loaded panels auto-scroll to the newest message.
   *
   * Validates: Requirements 7.3, 7.4
   */
  private _isNearBottom(): boolean {
    const el = this.messageListRef?.nativeElement;
    if (!el) return true;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    return distanceFromBottom <= 100;
  }

  // ── Private — message loading ────────────────────────────────────────────

  /**
   * Loads the first (newest) page of messages, page 0.
   *
   * Validates: Requirements 4.1, 4.2, 4.7
   */
  private _loadInitialMessages(): void {
    this._initialSub?.unsubscribe();
    this.loadingMessages.set(true);
    this.loadError.set(null);

    this._initialSub = this.messagingService
      .getMessages(this.conversationId, 0)
      .subscribe({
        next: (msgs) => {
          // Ensure chronological order (oldest first, newest last).
          //
          // Validates: Requirements 4.3
          this.messages.set(this._chronological(msgs));
          this.lowestLoadedPage.set(0);
          this.loadingMessages.set(false);
          this._scrollToBottomPending = true;
        },
        error: (err: unknown) => {
          this.loadError.set(this._errorMessage(err, 'Failed to load messages.'));
          this.loadingMessages.set(false);
        },
      });
  }

  /**
   * Loads the next-older page (lowestLoadedPage - 1) and prepends the results.
   *
   * Validates: Requirements 4.4, 4.5, 4.6, 4.7
   */
  private _loadMoreMessages(): void {
    const targetPage = this.lowestLoadedPage() - 1;
    if (targetPage < 0) return;

    this._moreSub?.unsubscribe();
    this.loadingMore.set(true);
    this.loadError.set(null);

    // Capture the scroll height so we can preserve position after prepending.
    this._prependAnchorHeight =
      this.messageListRef?.nativeElement.scrollHeight ?? null;

    this._moreSub = this.messagingService
      .getMessages(this.conversationId, targetPage)
      .subscribe({
        next: (older) => {
          const ordered = this._chronological(older);
          // Prepend older messages ahead of the currently displayed list.
          //
          // Validates: Requirements 4.4
          this.messages.update((current) => [...ordered, ...current]);
          this.lowestLoadedPage.set(targetPage);
          this.loadingMore.set(false);
        },
        error: (err: unknown) => {
          this._prependAnchorHeight = null;
          this.loadError.set(
            this._errorMessage(err, 'Failed to load older messages.')
          );
          this.loadingMore.set(false);
        },
      });
  }

  // ── Private — helpers ────────────────────────────────────────────────────

  /**
   * Returns a copy of the given messages ordered chronologically (oldest first).
   * Sorts by `firstMade` ascending.
   *
   * Validates: Requirements 4.3
   */
  private _chronological(msgs: Message[]): Message[] {
    return [...msgs].sort(
      (a, b) => new Date(a.firstMade).getTime() - new Date(b.firstMade).getTime()
    );
  }

  private _scrollToBottom(): void {
    const el = this.messageListRef?.nativeElement;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }

  private _errorMessage(err: unknown, fallback: string): string {
    return err instanceof Error && err.message ? err.message : fallback;
  }
}
