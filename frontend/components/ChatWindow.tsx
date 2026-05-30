"use client";

import { useEffect, useRef } from "react";
import type { Message } from "ai/react";
import type { ChangeEvent } from "react";
import Link from "next/link";
import MessageBubble from "./MessageBubble";
import ProviderSelector, { type Provider } from "./ProviderSelector";

interface Props {
  messages: Message[];
  input: string;
  isLoading: boolean;
  provider: Provider;
  model: string;
  streamError: string | null;
  onProviderChange: (provider: Provider, model: string) => void;
  onInputChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  onSubmit: (e: { preventDefault: () => void }) => void;
  onStop: () => void;
}

export default function ChatWindow({
  messages, input, isLoading, provider, model, streamError,
  onProviderChange, onInputChange, onSubmit, onStop,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col flex-1 h-full">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-3 bg-white/5 backdrop-blur-sm border-b border-white/10">
        <span className="text-white/40 text-sm">
          {messages.length === 0 ? "Start a new conversation" : `${messages.length} messages`}
        </span>
        <div className="flex items-center gap-3">
          <ProviderSelector value={provider} model={model} onChange={onProviderChange} />
          <Link
            href="/dashboard"
            className="text-xs text-white/50 hover:text-white/90 transition-colors border border-white/10 rounded-lg px-3 py-1.5 bg-white/5 hover:bg-white/10"
          >
            Dashboard
          </Link>
        </div>
      </header>

      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-6 py-4 messages-scroll bg-white/[0.03]">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-white/25 text-sm">Send a message to begin</p>
          </div>
        )}
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
        {isLoading && messages[messages.length - 1]?.role === "user" && (
          <div className="flex justify-start mb-4">
            <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1 items-center">
              <span className="w-2 h-2 bg-white/40 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="w-2 h-2 bg-white/40 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="w-2 h-2 bg-white/40 rounded-full animate-bounce" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="px-6 py-4 bg-white/5 backdrop-blur-sm border-t border-white/10">
        {streamError && (
          <p className="text-red-400 text-xs mb-3 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            {streamError}
          </p>
        )}
        <form onSubmit={onSubmit} className="flex gap-3 items-end">
          <textarea
            value={input}
            onChange={onInputChange}
            placeholder="Type a message..."
            rows={1}
            disabled={isLoading}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
            className="flex-1 resize-none bg-white/10 text-white placeholder-white/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/50 disabled:opacity-40 border border-white/10"
          />

          {isLoading ? (
            <button
              type="button"
              onClick={onStop}
              className="bg-red-500/80 hover:bg-red-500 text-white px-4 py-3 rounded-xl text-sm transition-all shadow-lg shadow-red-500/20"
            >
              Stop
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="bg-indigo-500/80 hover:bg-indigo-500 disabled:opacity-30 text-white px-4 py-3 rounded-xl text-sm transition-all shadow-lg shadow-indigo-500/20"
            >
              Send
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
