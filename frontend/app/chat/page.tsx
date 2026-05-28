"use client";

import { useState, useEffect, useCallback } from "react";
import { useChat } from "@ai-sdk/react";
import Sidebar from "@/components/Sidebar";
import ChatWindow from "@/components/ChatWindow";
import type { Provider } from "@/components/ProviderSelector";
import { API } from "@/lib/endpoints";

interface Conversation {
  id: string;
  title: string;
  provider: string;
  updated_at: string;
}

//  Flow
// 1. Page loads  -  fetchConversations() fills the sidebar
// 2. User types + submits  - useChat POSTs to /api/chat
// 3. /api/chat creates a conversation + message, calls SDK
// 4. SDK calls Gemini (or chosen provider), streams back tokens
// 5. Stream arrives here via useChat, renders token by token
// 6. onResponse reads X-Conversation-Id header  -  updates sidebar
// 7. Clicking a conversation  -  loads its messages  -  resumes context
// 8. Stop button  -  stop() cancels the in-flight stream (bonus feature)

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [provider, setProvider] = useState<Provider>("google");
  const [model, setModel] = useState<string>("gemini-1.5-flash");

  // useChat is a Vercel SDK: it manages messages state, input state, streaming, and the POST call.
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    stop,
    setMessages,
  } = useChat({
    api: API.CHAT,
    body: { conversationId, provider, model }, // useChat already sends messages[] automatically
    // body just adds our own extra data on top
    onResponse: (response) => {
      // Called as soon as the server responds (before stream finishes)

      const newId = response.headers.get("X-Conversation-Id");
      if (newId && !conversationId) {
        setConversationId(newId);
        fetchConversations();
      }
    },
    onFinish: () => {
      fetchConversations();
    },
  });

  const fetchConversations = useCallback(async () => {
    const res = await fetch(API.CONVERSATIONS);
    const data = await res.json();
    setConversations(data);
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Start a brand-new chat
  const handleNewChat = useCallback(() => {
    setConversationId(null);
    setMessages([]);
  }, [setMessages]);

  // Resume an existing conversation loads its messages as context
  const handleSelectConversation = useCallback(
    async (id: string) => {
      const res = await fetch(API.MESSAGES(id));
      const data = await res.json();
      setConversationId(id);
      // Map DB message rows to the shape useChat expects
      setMessages(
        data.map((m: { id: string; role: string; content: string }) => ({
          id: m.id,
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      );
    },
    [setMessages],
  );

  // Delete a conversation — if it's the active one, clear the chat too
  const handleDeleteConversation = useCallback(
    async (id: string) => {
      await fetch(API.CONVERSATION(id), { method: "DELETE" });
      if (conversationId === id) handleNewChat();
      fetchConversations();
    },
    [conversationId, handleNewChat, fetchConversations],
  );

  const handleProviderChange = useCallback((p: Provider, m: string) => {
    setProvider(p);
    setModel(m);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        conversations={conversations}
        selectedId={conversationId}
        onNew={handleNewChat}
        onSelect={handleSelectConversation}
        onDelete={handleDeleteConversation}
      />
      <ChatWindow
        messages={messages}
        input={input}
        isLoading={isLoading}
        provider={provider}
        onProviderChange={handleProviderChange}
        onInputChange={handleInputChange}
        onSubmit={handleSubmit}
        onStop={stop}
      />
    </div>
  );
}
