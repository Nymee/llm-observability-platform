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
            ? "bg-blue-600 text-white rounded-br-sm"
            : "bg-gray-700 text-gray-100 rounded-bl-sm"
        }`}
      >
        {/* Role label for assistant messages */}
        {!isUser && (
          <p className="text-xs text-gray-400 mb-1 font-medium uppercase tracking-wide">
            Assistant
          </p>
        )}
        {message.content}
      </div>
    </div>
  );
}
