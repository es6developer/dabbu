import { useState, useCallback } from 'react';
import { AIMessage, AIResponse } from '../types';
import { processAIChat } from '../services/aiEngine';
import { generateId } from '../types';

export function useAI(userId: string = 'user') {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeOptions, setActiveOptions] = useState<{ field: string; options: string[]; context?: any } | null>(null);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: AIMessage = {
      id: generateId(), role: 'user', text: text.trim(), timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setActiveOptions(null);
    setLoading(true);

    try {
      const response: AIResponse = await processAIChat(userId, text.trim());

      const aiMsg: AIMessage = {
        id: generateId(), role: 'assistant', text: response.message,
        action: response.action, data: response.data, timestamp: Date.now(),
      };

      if (response.action === 'ask' && response.options?.length) {
        aiMsg.options = response.options;
        aiMsg.field = response.field;
        setActiveOptions({ field: response.field || '', options: response.options, context: response.data });
      } else {
        setActiveOptions(null);
      }

      setMessages((prev) => [...prev, aiMsg]);
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        { id: generateId(), role: 'assistant', text: `${e.message || 'Something went wrong.'}`, timestamp: Date.now() },
      ]);
    } finally {
      setLoading(false);
    }
  }, [userId, loading]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setActiveOptions(null);
  }, []);

  return { messages, loading, activeOptions, sendMessage, clearMessages, setActiveOptions };
}
