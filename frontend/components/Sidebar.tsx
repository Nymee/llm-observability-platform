"use client";

import Link from "next/link";

interface Conversation {
  id: string;
  title: string;
  provider: string;
  updated_at: string;
}

interface Props {
  conversations: Conversation[];
  selectedId: string | null;
  onNew: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function Sidebar({ conversations, selectedId, onNew, onSelect, onDelete }: Props) {
  return (
    <aside className="w-64 bg-gray-900 border-r border-gray-700 flex flex-col h-full shrink-0">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <h1 className="text-white font-semibold text-sm mb-3">LLM Observer</h1>
        <button
          onClick={onNew}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 px-3 rounded-lg transition-colors"
        >
          + New Chat
        </button>
      </div>

      {/* Dashboard link */}
      <div className="px-4 py-2 border-b border-gray-700">
        <Link
          href="/dashboard"
          className="block text-xs text-gray-400 hover:text-white transition-colors py-1"
        >
          Dashboard →
        </Link>
      </div>

      {/* Conversation list */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
        {conversations.length === 0 && (
          <p className="text-gray-500 text-xs px-2 pt-2">No conversations yet</p>
        )}
        {conversations.map((convo) => (
          <div
            key={convo.id}
            className={`group flex items-center justify-between rounded-lg px-3 py-2 cursor-pointer transition-colors ${
              selectedId === convo.id
                ? "bg-gray-700 text-white"
                : "text-gray-400 hover:bg-gray-800 hover:text-white"
            }`}
            onClick={() => onSelect(convo.id)}
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm truncate">{convo.title}</p>
              <p className="text-xs text-gray-500 capitalize">{convo.provider}</p>
            </div>

            {/* Delete button — only visible on hover */}
            <button
              onClick={(e) => {
                e.stopPropagation(); // don't trigger onSelect
                onDelete(convo.id);
              }}
              className="ml-2 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity text-xs"
              title="Delete conversation"
            >
              ✕
            </button>
          </div>
        ))}
      </nav>
    </aside>
  );
}
