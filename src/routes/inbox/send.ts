import { jsonResponse } from "../../_lib/utils";
import { auth } from "../../_lib/auth";
import type { Env } from "../../index";
import type { InboxMessage } from "./types";
import { appendMessage, getConversation, upsertConversation } from "./kv";

function newId(): string {
  return (globalThis.crypto?.randomUUID?.() || `${Date.now()}_${Math.random().toString(16).slice(2)}`);
}

export async function inboxSendHandler(req: Request, env: Env) {
  try {
    const { companyId } = await auth(req, env);
    const body = await req.json().catch(() => null);

    const convKey = body?.convKey ? String(body.convKey) : "";
    const text = body?.text ? String(body.text) : "";
    const meta = body?.meta && typeof body.meta === "object" ? body.meta : undefined;

    if (!convKey || !text.trim()) {
      return jsonResponse({ success: false, error: "INBOX_BAD_REQUEST" }, 400);
    }

    const conv = await getConversation(env, companyId, convKey);
    if (!conv) {
      return jsonResponse({ success: false, error: "INBOX_NOT_FOUND" }, 404);
    }

    const msg: InboxMessage = {
      id: newId(),
      convKey,
      direction: "out",
      text: text.trim(),
      ts: Date.now(),
      meta,
    };

    await appendMessage(env, companyId, convKey, msg);

    conv.lastMessage = msg.text;
    conv.lastAt = msg.ts;
    // Sending a reply typically clears unread
    conv.unreadCount = 0;

    await upsertConversation(env, conv);

    // NOTE: actual WhatsApp delivery is handled by your device runtime / Baileys layer later
    return jsonResponse({ success: true, messageId: msg.id });
  } catch (e) {
    console.error("[inbox:send]", e);
    return jsonResponse({ success: false, error: "INBOX_INTERNAL" }, 500);
  }
}
