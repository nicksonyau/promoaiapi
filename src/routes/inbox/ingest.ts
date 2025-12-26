import type { Env } from "../../index";
import type { InboxChannel, InboxConversation, InboxMessage } from "./types";
import { appendMessage, getConversation, upsertConversation } from "./kv";

function newId(): string {
  // Cloudflare Workers supports crypto.randomUUID()
  return (globalThis.crypto?.randomUUID?.() || `${Date.now()}_${Math.random().toString(16).slice(2)}`);
}

export async function ingestIncomingMessage(
  env: Env,
  companyId: string,
  channel: InboxChannel,
  externalId: string,
  text: string,
  meta?: Record<string, any>
): Promise<{ convKey: string; messageId: string }> {
  const convKey = `${channel}:${externalId}`; // stable + deterministic

  let conv = await getConversation(env, companyId, convKey);

  if (!conv) {
    const created: InboxConversation = {
      convKey,
      companyId,
      channel,
      externalId,
      lastMessage: text,
      lastAt: Date.now(),
      unreadCount: 0,
      status: "open",
    };
    conv = created;
  }

  const msg: InboxMessage = {
    id: newId(),
    convKey,
    direction: "in",
    text: String(text || ""),
    ts: Date.now(),
    meta: meta && typeof meta === "object" ? meta : undefined,
  };

  await appendMessage(env, companyId, convKey, msg);

  conv.lastMessage = msg.text;
  conv.lastAt = msg.ts;
  conv.unreadCount = (conv.unreadCount || 0) + 1;
  if (conv.status !== "open") conv.status = "open";

  await upsertConversation(env, conv);

  return { convKey, messageId: msg.id };
}
