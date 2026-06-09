import { ConversationState, ConversationStep, IntentType, AIResponse } from '../types/ai';

const STORE_KEY = '@dabbu_ai_conv_state';

// In-memory is faster than AsyncStorage for active conversations
const activeStates = new Map<string, ConversationState>();

export function getConversation(userId: string): ConversationState | null {
  return activeStates.get(userId) || null;
}

export function setConversation(
  userId: string,
  step: ConversationStep,
  intent: IntentType,
  context: Record<string, any> = {},
  data: Record<string, any> = {},
): void {
  activeStates.set(userId, { step, intent, context, data });
}

export function clearConversation(userId: string): void {
  activeStates.delete(userId);
}

export function hasActiveConversation(userId: string): boolean {
  return activeStates.has(userId);
}

export function cancelResponse(): AIResponse {
  return {
    action: 'cancel',
    message: 'Cancelled. What else can I help with?',
  };
}

export function askResponse(
  question: string,
  field: string,
  options: string[],
  context?: Record<string, any>,
): AIResponse {
  return {
    action: 'ask',
    message: question,
    field,
    options,
    data: context,
  };
}

export function messageResponse(text: string, data?: any): AIResponse {
  return {
    action: 'message',
    message: text,
    data,
  };
}

export function actionResponse(action: string, message: string, data?: any): AIResponse {
  return {
    action: 'action',
    message,
    data: { ...data, _actionType: action },
  };
}
