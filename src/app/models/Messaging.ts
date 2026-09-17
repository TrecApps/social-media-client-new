// Angular Messaging Frontend — shared TypeScript interfaces and model types

// ---- Conversation ----

export interface ConversationMarker {
  messageId: string;
  messageMade: string;       // ISO-8601 OffsetDateTime
  previousMessages: number;
}

export interface Conversation {
  id: string;
  apps: string[];
  profiles: string[];        // participant profile UUIDs
  currentPage: number;
  markers: ConversationMarker[];
  level: number;
  messageBase?: string;
  // derived on the frontend:
  latestActivity?: string;   // ISO-8601, taken from last marker's messageMade
}

// ---- Message ----

export interface MessageVersion {
  message: string;
  made: string;              // ISO-8601 OffsetDateTime
}

export interface Reaction {
  seen: string;              // ISO-8601 OffsetDateTime
  reaction: string;
}

export interface Message {
  id: string;
  conversationId: string;
  profile: string;           // author profile UUID
  firstMade: string;         // ISO-8601 OffsetDateTime
  messageVersions: MessageVersion[];
  page: number;
  reactions: { [profileId: string]: Reaction };
  conversationIdBranch?: string;
}

// ---- WebSocket Events ----

export type EventType =
  | 'NEW_MESSAGE'
  | 'MESSAGE_SEEN'
  | 'MESSAGE_REACTION'
  | 'MESSAGE_EDIT';

export interface ConversationEvent {
  eventType: EventType;
  conversationId: string;
  actorProfileId: string;
  payload: Message | string[] | null;
}

// ---- WebSocket Status ----

export type WebSocketConnectionStatus =
  | 'CONNECTING'
  | 'CONNECTED'
  | 'BACKOFF'
  | 'FAILED'
  | 'DISCONNECTED';

// ---- Panel Manager ----

export interface PanelEntry {
  conversation: Conversation;
  lastInteractionTime: Date;
  isFocused: boolean;
}

// ---- Chat Panel Edit State ----

export interface EditState {
  messageId: string;
  draft: string;
}

// ---- Helper Functions ----

/**
 * Returns the `messageMade` timestamp of the last entry in `conversation.markers`,
 * or `undefined` if `markers` is absent or empty.
 * This is used as the derived `latestActivity` for sorting the conversation list.
 */
export function latestActivity(conversation: Conversation): string | undefined {
  if (!conversation.markers || conversation.markers.length === 0) {
    return undefined;
  }
  return conversation.markers[conversation.markers.length - 1]?.messageMade;
}

/**
 * Aggregates the per-profile reaction map into a count per distinct reaction string.
 *
 * @param reactions - The `Message.reactions` map keyed by profile UUID.
 * @returns A `Map` whose keys are distinct emoji/reaction strings and values are
 *          the number of profiles that submitted that reaction.
 *
 * Validates: Requirements 9.2 (aggregating reaction counts for display)
 */
export function aggregateReactions(reactions: { [k: string]: Reaction }): Map<string, number> {
  const counts = new Map<string, number>();
  for (const r of Object.values(reactions)) {
    counts.set(r.reaction, (counts.get(r.reaction) ?? 0) + 1);
  }
  return counts;
}
