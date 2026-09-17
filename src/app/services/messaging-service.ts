import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../environment/environment';
import { Conversation, Message } from '../models/Messaging';

const plainTextHeaders = new HttpHeaders({ 'Content-Type': 'text/plain' });
const BASE = environment.message_service_url;
const APP_ID = environment.app_name;

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

}
