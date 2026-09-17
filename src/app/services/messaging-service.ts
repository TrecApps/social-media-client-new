import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../environment/environment';
import { Conversation, ConversationEvent, Message, WebSocketConnectionStatus } from '../models/Messaging';

const plainTextHeaders = new HttpHeaders({ 'Content-Type': 'text/plain' });
const BASE = environment.message_service_url;
const APP_ID = environment.app_name;

// ---------------------------------------------------------------------------
// Wire protocol (native WebSocket — no STOMP)
// ---------------------------------------------------------------------------
//
// The backend now serves a native reactive WebSocket at `/ws` (Spring WebFlux
// on Netty). STOMP has been dropped. The protocol is small JSON frames:
//
//   Client -> server:
//     { "action": "SUBSCRIBE",   "conversationId": "<uuid>" }
//     { "action": "UNSUBSCRIBE", "conversationId": "<uuid>" }
//
//   Server -> client:
//     - A domain event (has an `eventType` field): ConversationEvent
//     - A control frame (has a `type` field):
//         { "type": "SUBSCRIBED",   "conversationId": "<uuid>" }
//         { "type": "UNSUBSCRIBED", "conversationId": "<uuid>" }
//         { "type": "ERROR",        "conversationId": "<uuid>", "message": "..." }
//
// Authentication happens during the HTTP upgrade: the browser automatically
// sends the auth cookie this deployment uses, so no token needs to be attached
// here. The backend rejects the handshake (closing the socket) when the cookie
// is missing/invalid or the account lacks the TREC_VERIFIED authority.

/** A client command frame sent to the server. */
interface ClientCommand {
  action: 'SUBSCRIBE' | 'UNSUBSCRIBE';
  conversationId: string;
}

/** A control frame received from the server (distinguished by the `type` field). */
interface ServerControlFrame {
  type: 'SUBSCRIBED' | 'UNSUBSCRIBED' | 'ERROR';
  conversationId?: string;
  message?: string;
}

/** A pending subscription request waiting for the socket to open. */
interface PendingSubscription {
  conversationId: string;
  failureCallback: () => void;
  enqueuedAt: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_PENDING = 50;
const QUEUE_TIMEOUT_MS = 10_000;
const MAX_ATTEMPTS = 10;

/**
 * Computes the exponential backoff delay for reconnect attempt `n` (1-based).
 *
 * delay(n) = min(5000 × 2^(n−1), 60000)  [milliseconds]
 *
 * Validates: Requirements 5.3, 5.7
 */
export function backoffDelay(attempt: number): number {
  return Math.min(5_000 * Math.pow(2, attempt - 1), 60_000);
}

/**
 * Type guard: is the parsed frame a domain ConversationEvent (vs a control frame)?
 */
function isConversationEvent(frame: unknown): frame is ConversationEvent {
  return (
    typeof frame === 'object' &&
    frame !== null &&
    'eventType' in frame &&
    'conversationId' in frame
  );
}

/**
 * MessagingService with WebSocket Support
 *
 * Manages a single shared native WebSocket connection for all open chat panels.
 * The public API is unchanged from the previous STOMP-based implementation so
 * that `ChatPanelComponent` and `ConversationListPageComponent` need no changes:
 *   - `connectionStatus$` — stream of WebSocketConnectionStatus values
 *   - `conversationUpdates$` — every incoming ConversationEvent
 *   - `eventsFor(conversationId)` — multicast Observable of ConversationEvent
 *   - `subscribe(conversationId)` / `unsubscribe(conversationId)`
 *   - `connect()` / `disconnect()`
 *
 * Validates: Requirements 5.1–5.7, 6.1–6.6, 7.6
 */
@Injectable({
  providedIn: 'root',
})
export class MessagingService {
  constructor(private http: HttpClient) {}

  /**
   * Fetches all conversations for the current app.
   * Derives `latestActivity` from the last entry in each conversation's `markers` array.
   *
   * Validates: Requirements 2.1, 4.1
   */
  getConversations(): Observable<Conversation[]> {
    const params = new HttpParams().set('appId', APP_ID);
    return this.http
      .get<Conversation[]>(`${BASE}/Conversations`, {
        params,
        withCredentials: true,
      })
      .pipe(
        map((conversations) =>
          conversations.map((conv) => {
            const markers = conv.markers;
            const latestActivity =
              markers && markers.length > 0
                ? markers[markers.length - 1].messageMade
                : undefined;
            return { ...conv, latestActivity };
          })
        )
      );
  }

  /**
   * Creates a new conversation with the given participant profile IDs.
   *
   * Validates: Requirements 2.1
   */
  createConversation(profileIds: string[]): Observable<Conversation> {
    const params = new HttpParams().set('appId', APP_ID);
    return this.http.post<Conversation>(`${BASE}/Conversations`, profileIds, {
      params,
      withCredentials: true,
    });
  }

  /**
   * Fetches a page of messages for a conversation.
   *
   * Validates: Requirements 4.1, 4.4
   */
  getMessages(convId: string, page: number): Observable<Message[]> {
    const params = new HttpParams()
      .set('conversationId', convId)
      .set('page', page.toString());
    return this.http.get<Message[]>(`${BASE}/Messages`, {
      params,
      withCredentials: true,
    });
  }

  /**
   * Fetches messages received after `since` for a conversation (used for polling fallback).
   *
   * Validates: Requirements 4.1
   */
  getLatestMessages(convId: string, since: string): Observable<Message[]> {
    const params = new HttpParams()
      .set('conversationId', convId)
      .set('time', since);
    return this.http.get<Message[]>(`${BASE}/Messages/latest`, {
      params,
      withCredentials: true,
    });
  }

  /**
   * Sends a plain-text message to a conversation.
   *
   * Validates: Requirements 11.2
   */
  sendMessage(convId: string, text: string): Observable<Message> {
    const params = new HttpParams().set('conversationId', convId);
    return this.http.post<Message>(`${BASE}/Messages`, text, {
      headers: plainTextHeaders,
      params,
      withCredentials: true,
    });
  }

  /**
   * Marks a list of messages as seen by the current user.
   *
   * Validates: Requirements 12.1
   */
  markSeen(messageIds: string[]): Observable<void> {
    return this.http.patch<void>(`${BASE}/Messages/seen`, messageIds, {
      withCredentials: true,
    });
  }

  /**
   * Reacts to a message with an emoji.
   *
   * Validates: Requirements 13.2
   */
  reactToMessage(messageId: string, emoji: string): Observable<Message> {
    const params = new HttpParams().set('messageId', messageId);
    return this.http.patch<Message>(`${BASE}/Messages/react`, emoji, {
      headers: plainTextHeaders,
      params,
      withCredentials: true,
    });
  }

  /**
   * Edits the text of an existing message.
   *
   * Validates: Requirements 14.3
   */
  editMessage(messageId: string, text: string): Observable<Message> {
    const params = new HttpParams().set('messageId', messageId);
    return this.http.put<Message>(`${BASE}/Messages`, text, {
      headers: plainTextHeaders,
      params,
      withCredentials: true,
    });
  }

    // -------------------------------------------------------------------------
  // Connection status
  // -------------------------------------------------------------------------

  private readonly _connectionStatus$ =
    new BehaviorSubject<WebSocketConnectionStatus>('DISCONNECTED');

  /** Observable stream of the current WebSocket connection state. */
  readonly connectionStatus$: Observable<WebSocketConnectionStatus> =
    this._connectionStatus$.asObservable();

  // -------------------------------------------------------------------------
  // Native WebSocket
  // -------------------------------------------------------------------------

  private _socket: WebSocket | null = null;

  private readonly _url = `${environment.message_service_ws_url}/ws`;

  // -------------------------------------------------------------------------
  // Conversation-level update stream (used by ConversationListPageComponent)
  // -------------------------------------------------------------------------

  private readonly _conversationUpdates$ = new Subject<ConversationEvent>();

  /** Public read-only view of all incoming ConversationEvents. */
  readonly conversationUpdates$: Observable<ConversationEvent> =
    this._conversationUpdates$.asObservable();

  // -------------------------------------------------------------------------
  // Per-conversation event subjects
  // -------------------------------------------------------------------------

  /** One Subject per active conversationId, fanned-out from incoming events. */
  private readonly _eventSubjects = new Map<string, Subject<ConversationEvent>>();

  /** Conversations for which a SUBSCRIBE frame has been sent (or confirmed). */
  private readonly _activeSubscriptions = new Set<string>();

  // -------------------------------------------------------------------------
  // Subscription pending queue
  // -------------------------------------------------------------------------

  private _pendingQueue: PendingSubscription[] = [];
  private _queueTimeoutHandle: ReturnType<typeof setTimeout> | null = null;

  // -------------------------------------------------------------------------
  // Backoff / reconnect state
  // -------------------------------------------------------------------------

  private _attempt = 0;
  private _backoffHandle: ReturnType<typeof setTimeout> | null = null;
  private _intentionalDisconnect = false;

  // -------------------------------------------------------------------------
  // Public lifecycle — called by AppComponent / route handlers
  // -------------------------------------------------------------------------

  /**
   * Initiates the WebSocket connection.
   *
   * Validates: Requirements 5.1, 5.2
   */
  connect(): void {
    this._intentionalDisconnect = false;
    this._attempt = 0;
    this._doConnect();
  }

  /**
   * Tears down the connection and cleans up all state.
   *
   * Validates: Requirements 5.4, 5.5
   */
  disconnect(): void {
    this._intentionalDisconnect = true;
    this._cancelBackoff();
    this._clearQueueTimeout();
    this._drainPendingQueueWithFailure();
    this._activeSubscriptions.clear();
    this._completeAllEventSubjects();
    this._attempt = 0;

    this._closeSocket();

    this._setStatus('DISCONNECTED');
  }

  // -------------------------------------------------------------------------
  // Public subscription API — called by ChatPanelComponent
  // -------------------------------------------------------------------------

  /**
   * Requests a subscription for `conversationId`. If the socket is open the
   * SUBSCRIBE frame is sent immediately; otherwise the request is queued
   * (max 50; 10 s timeout) and flushed once the socket opens.
   *
   * Validates: Requirements 6.1, 6.4, 6.5
   */
  subscribe(conversationId: string): void {
    // Idempotent — ignore duplicates (already subscribed or already queued).
    if (this._activeSubscriptions.has(conversationId)) return;
    if (this._pendingQueue.some((p) => p.conversationId === conversationId)) return;

    if (this._connectionStatus$.value === 'CONNECTED' && this._isSocketOpen()) {
      this._doSubscribe(conversationId);
      return;
    }

    if (this._pendingQueue.length >= MAX_PENDING) {
      console.warn(
        `[WebSocketService] Subscription queue overflow. Notifying ${conversationId} of failure.`
      );
      this._notifySubscriptionFailure(conversationId);
      return;
    }

    this._pendingQueue.push({
      conversationId,
      failureCallback: () => this._notifySubscriptionFailure(conversationId),
      enqueuedAt: Date.now(),
    });

    if (this._pendingQueue.length === 1) {
      this._startQueueTimeout();
    }
  }

  /**
   * Cancels the subscription for `conversationId` and completes its Subject.
   *
   * Validates: Requirements 6.2
   */
  unsubscribe(conversationId: string): void {
    // Remove from pending queue if not yet subscribed.
    this._pendingQueue = this._pendingQueue.filter(
      (p) => p.conversationId !== conversationId
    );
    if (this._pendingQueue.length === 0) {
      this._clearQueueTimeout();
    }

    // Send UNSUBSCRIBE if the socket is open and we had an active subscription.
    if (this._activeSubscriptions.delete(conversationId) && this._isSocketOpen()) {
      this._send({ action: 'UNSUBSCRIBE', conversationId });
    }

    // Complete and remove the event subject.
    const subject = this._eventSubjects.get(conversationId);
    if (subject) {
      subject.complete();
      this._eventSubjects.delete(conversationId);
    }
  }

  // -------------------------------------------------------------------------
  // Public event stream
  // -------------------------------------------------------------------------

  /**
   * Returns a multicast Observable of ConversationEvent for `conversationId`.
   *
   * Validates: Requirements 6.3, 6.6
   */
  eventsFor(conversationId: string): Observable<ConversationEvent> {
    return this._getOrCreateSubject(conversationId).asObservable();
  }

  // -------------------------------------------------------------------------
  // Private — connection helpers
  // -------------------------------------------------------------------------

  private _doConnect(): void {
    if (this._intentionalDisconnect) return;
    if (this._isSocketOpen() || this._isSocketConnecting()) return;

    this._setStatus('CONNECTING');

    let socket: WebSocket;
    try {
      socket = new WebSocket(this._url);
    } catch (err) {
      console.error('[WebSocketService] Failed to open WebSocket:', err);
      this._onSocketClosed();
      return;
    }
    this._socket = socket;

    socket.onopen = () => this._onOpen();
    socket.onmessage = (ev) => this._onMessage(ev);
    socket.onerror = () => {
      // The browser fires `error` then `close`; reconnection is driven by close.
      console.error('[WebSocketService] WebSocket error');
    };
    socket.onclose = () => this._onSocketClosed();
  }

  private _onOpen(): void {
    this._attempt = 0;
    this._clearQueueTimeout();
    this._setStatus('CONNECTED');
    this._drainPendingQueue();
  }

  private _onSocketClosed(): void {
    this._socket = null;

    if (this._intentionalDisconnect) return;

    this._attempt += 1;

    if (this._attempt > MAX_ATTEMPTS) {
      this._setStatus('FAILED');
      return;
    }

    // Active subscriptions must be re-sent after reconnect; move them back to
    // the pending queue so they are flushed on the next open.
    this._reenqueueActiveSubscriptions();

    const delay = backoffDelay(this._attempt);
    this._setStatus('BACKOFF');

    this._backoffHandle = setTimeout(() => {
      this._backoffHandle = null;
      this._doConnect();
    }, delay);
  }

  private _onMessage(ev: MessageEvent): void {
    let frame: unknown;
    try {
      frame = JSON.parse(typeof ev.data === 'string' ? ev.data : String(ev.data));
    } catch (err) {
      console.error('[WebSocketService] Failed to parse incoming frame:', err);
      return;
    }

    if (isConversationEvent(frame)) {
      this._handleEvent(frame);
      return;
    }

    // Otherwise it is a control frame.
    this._handleControlFrame(frame as ServerControlFrame);
  }

  private _handleEvent(event: ConversationEvent): void {
    // Fan out to the per-conversation subject for ChatPanelComponent.
    const subject = this._eventSubjects.get(event.conversationId);
    subject?.next(event);
    // Broadcast to the global updates stream for ConversationListPageComponent.
    this._conversationUpdates$.next(event);
  }

  private _handleControlFrame(frame: ServerControlFrame): void {
    switch (frame?.type) {
      case 'SUBSCRIBED':
        // Subscription confirmed — nothing extra to do; already tracked.
        break;
      case 'UNSUBSCRIBED':
        if (frame.conversationId) {
          this._activeSubscriptions.delete(frame.conversationId);
        }
        break;
      case 'ERROR':
        console.warn(
          `[WebSocketService] Server error for ${frame.conversationId ?? 'connection'}: ${frame.message}`
        );
        if (frame.conversationId) {
          this._notifySubscriptionFailure(frame.conversationId);
        }
        break;
      default:
        console.warn('[WebSocketService] Unknown control frame:', frame);
    }
  }

  private _cancelBackoff(): void {
    if (this._backoffHandle !== null) {
      clearTimeout(this._backoffHandle);
      this._backoffHandle = null;
    }
  }

  private _setStatus(status: WebSocketConnectionStatus): void {
    if (this._connectionStatus$.value !== status) {
      this._connectionStatus$.next(status);
    }
  }

  private _isSocketOpen(): boolean {
    return this._socket?.readyState === WebSocket.OPEN;
  }

  private _isSocketConnecting(): boolean {
    return this._socket?.readyState === WebSocket.CONNECTING;
  }

  private _closeSocket(): void {
    if (this._socket) {
      // Detach handlers so the intentional close does not trigger reconnect.
      this._socket.onopen = null;
      this._socket.onmessage = null;
      this._socket.onerror = null;
      this._socket.onclose = null;
      try {
        this._socket.close();
      } catch {
        // ignore
      }
      this._socket = null;
    }
  }

  // -------------------------------------------------------------------------
  // Private — subscription helpers
  // -------------------------------------------------------------------------

  /** Sends a SUBSCRIBE frame for `conversationId`. */
  private _doSubscribe(conversationId: string): void {
    try {
      this._send({ action: 'SUBSCRIBE', conversationId });
      this._activeSubscriptions.add(conversationId);
      // Ensure the event subject exists so events are not dropped.
      this._getOrCreateSubject(conversationId);
    } catch (err) {
      console.error(`[WebSocketService] Failed to subscribe to ${conversationId}:`, err);
      this._notifySubscriptionFailure(conversationId);
    }
  }

  private _send(command: ClientCommand): void {
    if (!this._isSocketOpen()) {
      throw new Error('WebSocket is not open');
    }
    this._socket!.send(JSON.stringify(command));
  }

  /** Drains the pending queue after the socket opens. */
  private _drainPendingQueue(): void {
    const queue = [...this._pendingQueue];
    this._pendingQueue = [];
    for (const pending of queue) {
      this._doSubscribe(pending.conversationId);
    }
  }

  /**
   * Moves currently-active subscriptions back into the pending queue so they are
   * re-sent after a reconnect. Existing event subjects are preserved.
   */
  private _reenqueueActiveSubscriptions(): void {
    for (const conversationId of this._activeSubscriptions) {
      if (!this._pendingQueue.some((p) => p.conversationId === conversationId)) {
        this._pendingQueue.push({
          conversationId,
          failureCallback: () => this._notifySubscriptionFailure(conversationId),
          enqueuedAt: Date.now(),
        });
      }
    }
    this._activeSubscriptions.clear();
  }

  /**
   * Discards the pending queue and notifies each panel of subscription failure.
   */
  private _drainPendingQueueWithFailure(): void {
    const queue = [...this._pendingQueue];
    this._pendingQueue = [];
    for (const pending of queue) {
      pending.failureCallback();
    }
  }

  private _notifySubscriptionFailure(conversationId: string): void {
    console.warn(
      `[WebSocketService] Subscription failed for conversation: ${conversationId}`
    );
    const subject = this._eventSubjects.get(conversationId);
    if (subject) {
      subject.error(
        new Error(`Subscription failed for conversation: ${conversationId}`)
      );
      this._eventSubjects.delete(conversationId);
    }
    this._activeSubscriptions.delete(conversationId);
  }

  // -------------------------------------------------------------------------
  // Private — queue timeout
  // -------------------------------------------------------------------------

  private _startQueueTimeout(): void {
    this._clearQueueTimeout();
    this._queueTimeoutHandle = setTimeout(() => {
      this._queueTimeoutHandle = null;
      console.warn(
        '[WebSocketService] subscription queue timeout. Discarding queue.'
      );
      this._drainPendingQueueWithFailure();
    }, QUEUE_TIMEOUT_MS);
  }

  private _clearQueueTimeout(): void {
    if (this._queueTimeoutHandle !== null) {
      clearTimeout(this._queueTimeoutHandle);
      this._queueTimeoutHandle = null;
    }
  }

  // -------------------------------------------------------------------------
  // Private — cleanup helpers
  // -------------------------------------------------------------------------

  private _completeAllEventSubjects(): void {
    for (const [, subject] of this._eventSubjects) {
      subject.complete();
    }
    this._eventSubjects.clear();
    // Note: _conversationUpdates$ is intentionally NOT completed here because
    // ConversationListPageComponent may re-subscribe after reconnect. It stays
    // alive for the lifetime of the service.
  }

  private _getOrCreateSubject(conversationId: string): Subject<ConversationEvent> {
    let subject = this._eventSubjects.get(conversationId);
    if (!subject) {
      subject = new Subject<ConversationEvent>();
      this._eventSubjects.set(conversationId, subject);
    }
    return subject;
  }

}
