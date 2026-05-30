"use client";


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
    <aside className="w-64 flex flex-col h-full shrink-0 bg-white/5 backdrop-blur-xl border-r border-white/10 shadow-2xl">
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <h1 className="text-white font-semibold text-sm mb-3 tracking-wide">LLM Observer</h1>
        <button
          onClick={onNew}
          className="w-full bg-indigo-500/80 hover:bg-indigo-500 text-white text-sm py-2 px-3 rounded-lg transition-all duration-200 backdrop-blur-sm shadow-lg shadow-indigo-500/20"
        >
          + New Chat
        </button>
      </div>

      {/* Conversation list */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
        {conversations.length === 0 && (
          <p className="text-white/30 text-xs px-2 pt-2">No conversations yet</p>
        )}
        {conversations.map((convo) => (
          <div
            key={convo.id}
            className={`group flex items-center justify-between rounded-lg px-3 py-2 cursor-pointer transition-all duration-150 ${
              selectedId === convo.id
                ? "bg-indigo-500/25 border border-indigo-400/30 text-white"
                : "text-white/50 hover:bg-white/10 hover:text-white/90 border border-transparent"
            }`}
            onClick={() => onSelect(convo.id)}
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm truncate">{convo.title}</p>
              <p className="text-xs text-white/30 capitalize mt-0.5">{convo.provider}</p>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(convo.id);
              }}
              className="ml-2 text-white/20 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all text-xs"
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
