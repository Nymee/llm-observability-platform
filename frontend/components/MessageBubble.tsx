"use client";

import type { Message } from "ai/react";

interface Props {
  message: Message;
}

export default function MessageBubble({ message }: Props) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? "bg-indigo-500/80 text-white rounded-br-sm shadow-lg shadow-indigo-500/20"
            : "bg-white/10 backdrop-blur-sm text-white/90 rounded-bl-sm border border-white/10"
        }`}
      >
        {!isUser && (
          <p className="text-xs text-indigo-300/60 mb-1 font-medium uppercase tracking-wide">
            Assistant
          </p>
        )}
        {message.content}
      </div>
    </div>
  );
}
