// src/routes/inbox/messages.ts
import { jsonResponse } from "../../_lib/utils";
import { auth } from "../../_lib/auth";
import type { Env } from "../../index";
import { getConversation, getMessages } from "./kv";

export async function inboxMessagesHandler(req: Request, env: Env) {
  try {
    const { companyId } = await auth(req, env);

    const { searchParams } = new URL(req.url);
    const convKey = searchParams.get("convKey");
    const limitRaw = searchParams.get("limit");
    const beforeRaw = searchParams.get("beforeTs");

    if (!convKey) {
      return jsonResponse({ success: false, error: "INBOX_BAD_REQUEST" }, 400);
    }

    const conv = await getConversation(env, companyId, convKey);
    if (!conv) {
      return jsonResponse({ success: false, error: "INBOX_NOT_FOUND" }, 404);
    }

    const limit = Math.max(1, Math.min(200, Number(limitRaw || "50")));
    const beforeTs = beforeRaw ? Number(beforeRaw) : null;

    const all = await getMessages(env, companyId, convKey);
    const filtered = beforeTs ? all.filter((m) => (m.ts || 0) < beforeTs) : all;
    const tail = filtered.slice(Math.max(0, filtered.length - limit));

    return jsonResponse({ success: true, messages: tail });
  } catch (e) {
    console.error("[inbox:messages]", e);
    return jsonResponse({ success: false, error: "INBOX_INTERNAL" }, 500);
  }
}
