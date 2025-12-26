// src/routes/inbox/list.ts

import { jsonResponse } from "../../_lib/utils";
import type { Env } from "../../index";
import { keys } from "./kv";

export async function inboxListHandler(req: Request, env: Env) {
  try {
    const companyId = (req as any).companyId;
    if (!companyId) {
    //  return jsonResponse({ success: false, error: "Unauthorized" }, 401);
    }

    const res = await env.KV.list({
      prefix: `inbox:idx:all:${companyId}:`,
      limit: 50
    });

    const conversations = [];
    for (const k of res.keys) {
      const parts = k.name.split(":");
      const convKey = decodeURIComponent(parts[parts.length - 1]);

      const raw = await env.KV.get(`inbox:conv:${companyId}:${encodeURIComponent(convKey)}`);
      if (raw) conversations.push(JSON.parse(raw));
    }

    return jsonResponse({ success: true, conversations });
  } catch (e: any) {
    console.error("[inbox:list]", e);
    return jsonResponse({ success: false, error: "INBOX_INTERNAL" }, 500);
  }
}
