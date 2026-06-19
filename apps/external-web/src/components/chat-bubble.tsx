"use client";

import { cn, formatCurrency, timeAgo } from "@/lib/utils";
import { MemberAvatar } from "./member-avatar";
import type { ChatMessage } from "@/lib/api";

interface ChatBubbleProps {
  message: ChatMessage;
  isOwn: boolean;
  showSender?: boolean;
}

export function ChatBubble({ message, isOwn, showSender = true }: ChatBubbleProps) {
  if (message.type === "system") {
    return (
      <div className="flex justify-center my-3 animate-fade-in-scale" style={{ willChange: 'transform, opacity' }}>
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-dabbu-surface2 border border-dabbu-border">
          <svg className="w-3.5 h-3.5 text-dabbu-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-xs text-dabbu-text-muted">{message.content}</span>
        </div>
      </div>
    );
  }

  if (message.type === "expense") {
    return (
      <div className={cn("flex my-2", isOwn ? "justify-end" : "justify-start")}>
        <div className="max-w-[80%] p-3 rounded-xl bg-dabbu-accent-muted border border-dabbu-accent/20">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm">💳</span>
            <span className="text-xs font-medium text-dabbu-accent">Expense</span>
          </div>
          <p className="text-sm text-dabbu-text">{message.content}</p>
          <span className="text-[10px] text-dabbu-text-muted mt-1 block">
            {timeAgo(message.createdAt)}
          </span>
        </div>
      </div>
    );
  }

  if (message.type === "settlement") {
    return (
      <div className={cn("flex my-2", isOwn ? "justify-end" : "justify-start")}>
        <div className="max-w-[80%] p-3 rounded-xl bg-dabbu-green-bg border border-dabbu-green/20">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm">💰</span>
            <span className="text-xs font-medium text-dabbu-green">Settlement</span>
          </div>
          <p className="text-sm text-dabbu-text">{message.content}</p>
          <span className="text-[10px] text-dabbu-text-muted mt-1 block">
            {timeAgo(message.createdAt)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex my-1.5 gap-2 animate-fade-in-up", isOwn ? "flex-row-reverse" : "flex-row")} style={{ animationDelay: '50ms', willChange: 'transform, opacity' }}>
      {showSender && !isOwn && (
        <div className="flex-shrink-0 self-end">
          <MemberAvatar name={message.sender.name} size="sm" />
        </div>
      )}
      {!showSender && !isOwn && <div className="w-7" />}

      <div className={cn("max-w-[75%]", isOwn && "items-end")}>
        {showSender && !isOwn && (
          <p className="text-[11px] text-dabbu-text-muted mb-0.5 ml-1">
            {message.sender.name}
          </p>
        )}
        <div
          className={cn(
            "px-3.5 py-2 rounded-2xl text-sm leading-relaxed",
            isOwn
              ? "bg-dabbu-accent text-white rounded-br-md"
              : "bg-dabbu-surface2 text-dabbu-text rounded-bl-md border border-dabbu-border"
          )}
        >
          {message.content}
        </div>
        <div className={cn("flex items-center gap-1.5 mt-0.5", isOwn && "flex-row-reverse")}>
          <span className="text-[10px] text-dabbu-text-muted">
            {timeAgo(message.createdAt)}
          </span>
          {isOwn && (
            <svg
              className={cn(
                "w-3 h-3",
                message.readBy.length > 1
                  ? "text-blue-400"
                  : "text-dabbu-text-muted"
              )}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}
