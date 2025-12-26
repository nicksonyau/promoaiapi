import { jsonResponse } from "../../_lib/utils";
import { auth } from "../../_lib/auth";
import type { Env } from "../../index";
import { getConversation, upsertConversation } from "./kv";

type InboxUpdateAction = "mark_read" | "open" | "close" | "set_unread";

export async function inboxUpdateHandler(req: Request, env: Env) {
  try {
    const { companyId } = await auth(req, env);
    const body = await req.json().catch(() => null);

    const convKey = body?.convKey ? String(body.convKey) : "";
    const action = body?.action ? (String(body.action) as InboxUpdateAction) : "";
    const unreadCountRaw = body?.unreadCount;

    if (!convKey || !action) {
      return jsonResponse({ success: false, error: "INBOX_BAD_REQUEST" }, 400);
    }

    const conv = await getConversation(env, companyId, convKey);
    if (!conv) {
      return jsonResponse({ success: false, error: "INBOX_NOT_FOUND" }, 404);
    }

    if (action === "mark_read") {
      conv.unreadCount = 0;
    } else if (action === "open") {
      conv.status = "open";
    } else if (action === "close") {
      conv.status = "closed";
    } else if (action === "set_unread") {
      const n = Number(unreadCountRaw);
      if (!Number.isFinite(n) || n < 0 || n > 9999) {
        return jsonResponse({ success: false, error: "INBOX_BAD_REQUEST" }, 400);
      }
      conv.unreadCount = Math.floor(n);
    } else {
      return jsonResponse({ success: false, error: "INBOX_BAD_REQUEST" }, 400);
    }

    await upsertConversation(env, conv);
    return jsonResponse({ success: true });
  } catch (e) {
    console.error("[inbox:update]", e);
    return jsonResponse({ success: false, error: "INBOX_INTERNAL" }, 500);
  }
}
