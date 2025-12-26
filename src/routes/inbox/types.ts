export type InboxChannel = "whatsapp" | "web";

export type InboxStatus = "open" | "closed";

export interface InboxConversation {
  convKey: string;         // stable key (e.g. "whatsapp:+6012..." or "web:session_...")
  companyId: string;

  channel: InboxChannel;
  externalId: string;      // phone or session id

  lastMessage: string;
  lastAt: number;

  unreadCount: number;
  status: InboxStatus;

  // reserved for future
  assignedTo?: string | null;
  tags?: string[];
}

export interface InboxMessage {
  id: string;
  convKey: string;

  direction: "in" | "out";
  text: string;

  ts: number;
  meta?: Record<string, any>;
}
