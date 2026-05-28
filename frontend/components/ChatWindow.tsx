"use client";

import { useEffect, useRef } from "react";
import type { Message } from "ai/react";
import type { ChangeEvent, FormEvent } from "react";
import MessageBubble from "./MessageBubble";
import ProviderSelector, { type Provider } from "./ProviderSelector";

interface Props {
  messages: Message[];
  input: string;
  isLoading: boolean;
  provider: Provider;
  onProviderChange: (provider: Provider, model: string) => void;
  onInputChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  onStop: () => void;
}

export default function ChatWindow({
  messages, input, isLoading, provider,
  onProviderChange, onInputChange, onSubmit, onStop,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col flex-1 bg-gray-800 h-full">

      {/* Top bar — provider selector */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-gray-700">
        <span className="text-gray-400 text-sm">
          {messages.length === 0 ? "Start a new conversation" : `${messages.length} messages`}
        </span>
        <ProviderSelector value={provider} onChange={onProviderChange} />
      </header>

      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-6 py-4 messages-scroll">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500 text-sm">Send a message to begin</p>
          </div>
        )}
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="px-6 py-4 border-t border-gray-700">
        <form onSubmit={onSubmit} className="flex gap-3 items-end">
          <textarea
            value={input}
            onChange={onInputChange}
            placeholder="Type a message..."
            rows={1}
            disabled={isLoading}
            onKeyDown={(e) => {
              // Submit on Enter, new line on Shift+Enter
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
            className="flex-1 resize-none bg-gray-700 text-gray-100 placeholder-gray-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />

          {/* Cancel button shown while streaming, Send button otherwise */}
          {isLoading ? (
            <button
              type="button"
              onClick={onStop}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-xl text-sm transition-colors"
            >
              Stop
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white px-4 py-3 rounded-xl text-sm transition-colors"
            >
              Send
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
