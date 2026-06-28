import { fetchNodeWithFallback } from './client';
import type { AuthUser } from './auth/auth';
import type { AIChatMetadata } from '../types/aiChat';

const AI_CHAT_RESPONSE_TIMEOUT_MS = 1800000;

export type AIChatRequest = {
  conversation_id?: string;
  input_method?: 'text' | 'voice';
  message: string;
  metadata?: AIChatMetadata;
  user_data?: AuthUser | Record<string, unknown> | null;
  user_id: string;
  user_name?: string;
};

export type AIConversationSummary = {
  id: string;
  last_message?: string | null;
  title?: string | null;
  updated_at?: string | null;
};

export type AIConversationMessage = {
  content: unknown;
  role: 'human' | 'ai' | string;
  route?: string | null;
};

export async function sendAIChatMessage(payload: AIChatRequest) {
  const response = await fetchNodeWithFallback('/api/ai/respond', {
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
    timeoutMs: AI_CHAT_RESPONSE_TIMEOUT_MS,
  });

  if (!response.ok) {
    throw new Error(`AI chat request failed with status ${response.status}`);
  }

  return response.json();
}

export async function listGeneralAIConversations(
  userId: string,
  userData?: AuthUser | Record<string, unknown> | null,
  options?: { limit?: number; offset?: number },
) {
  const response = await fetchNodeWithFallback('/api/ai/session/list-general', {
    body: JSON.stringify({
      limit: options?.limit,
      offset: options?.offset,
      user_data: userData || {},
      user_id: userId,
      user_name: getUserName(userData),
    }),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
    timeoutMs: 10000,
  });

  if (!response.ok) {
    throw new Error(`Conversation history request failed with status ${response.status}`);
  }

  return response.json() as Promise<{
    conversations?: AIConversationSummary[];
    has_more?: boolean;
    next_offset?: number;
  }>;
}

export async function loadAIConversation(
  conversationId: string,
  userId: string,
  userData?: AuthUser | Record<string, unknown> | null,
) {
  const response = await fetchNodeWithFallback('/api/ai/session/start', {
    body: JSON.stringify({
      conversation_id: conversationId,
      user_data: userData || {},
      user_id: userId,
      user_name: getUserName(userData),
    }),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
    timeoutMs: 10000,
  });

  if (!response.ok) {
    throw new Error(`Conversation load request failed with status ${response.status}`);
  }

  return response.json() as Promise<{
    conversation_id?: string;
    messages?: AIConversationMessage[];
  }>;
}

export function getUserId(user?: AuthUser | null) {
  return String(user?._id || user?.email || 'anonymous');
}

export function getUserName(user?: AuthUser | Record<string, unknown> | null) {
  const firstName = typeof user?.firstName === 'string' ? user.firstName : '';
  const lastName = typeof user?.lastName === 'string' ? user.lastName : '';
  const fullName = `${firstName} ${lastName}`.trim();
  const email = typeof user?.email === 'string' ? user.email : '';

  return fullName || email || 'User';
}
