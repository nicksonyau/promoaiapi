// workers/src/routes/chatpage/list.ts
import type { Env } from "../../index";
import { jsonResponse } from "../_lib/utils";
import { requireCompany } from "../../_lib/auth";

type ChatPageListItem = {
  id: string; // widgetId
  name?: string;
  chatbotId?: string;
  createdAt?: string;
  updatedAt?: string;
};

function safeParseJson(raw: string) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function pickName(rec: any) {
  const n1 = typeof rec?.name === "string" ? rec.name.trim() : "";
  if (n1) return n1;

  const n2 = typeof rec?.header?.title === "string" ? rec.header.title.trim() : "";
  if (n2) return n2;

  const n3 = typeof rec?.branding?.companyName === "string" ? rec.branding.companyName.trim() : "";
  if (n3) return n3;

  return "Chat Page";
}

function sortTs(item: ChatPageListItem) {
  const ts = Date.parse(String(item.updatedAt || item.createdAt || ""));
  return Number.isFinite(ts) ? ts : 0;
}

// GET /chatpage/list
export async function chatPageListHandler(req: Request, env: Env) {
  try {
    if (req.method !== "GET") {
      return jsonResponse({ success: false, error: "Method not allowed" }, 405);
    }

    const session = await requireCompany(env, req);
    if (!session?.companyId) {
      return jsonResponse({ success: false, error: "Unauthorized" }, 401);
    }

    // IMPORTANT: must match get/create/update key prefix
    const prefix = `chat_page:${session.companyId}:`;

    const list: ChatPageListItem[] = [];

    let cursor: string | undefined = undefined;

    do {
      const page = await env.KV.list({ prefix, cursor, limit: 1000 });
      cursor = page.cursor || undefined;

      for (const k of page.keys) {
        const key = k.name;
        const widgetIdFromKey = key.startsWith(prefix) ? key.slice(prefix.length) : "";
        if (!widgetIdFromKey) continue;

        const raw = await env.KV.get(key);
        if (!raw) continue;

        const rec: any = safeParseJson(raw);
        if (!rec || typeof rec !== "object") continue;

        const widgetId = String(rec.widgetId || widgetIdFromKey);

        list.push({
          id: widgetId,
          name: pickName(rec),
          chatbotId: typeof rec.chatbotId === "string" ? rec.chatbotId : undefined,
          createdAt: typeof rec.createdAt === "string" ? rec.createdAt : undefined,
          updatedAt: typeof rec.updatedAt === "string" ? rec.updatedAt : undefined,
        });
      }
    } while (cursor);

    list.sort((a, b) => sortTs(b) - sortTs(a));

    return jsonResponse({ success: true, list });
  } catch (e: any) {
    return jsonResponse({ success: false, error: e?.message || "Server error" }, 500);
  }
}
