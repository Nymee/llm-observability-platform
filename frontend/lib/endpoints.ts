export const API = {
  CHAT:          "/api/chat",
  CONVERSATIONS: "/api/conversations",
  CONVERSATION:  (id: string) => `/api/conversations/${id}`,
  MESSAGES:      (id: string) => `/api/conversations/${id}/messages`,
  DASHBOARD:     "/api/dashboard",
} as const;
