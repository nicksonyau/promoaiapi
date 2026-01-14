import type { Env } from "../../index";
import { jsonResponse } from "../_lib/utils";
import { requireCompany } from "../../_lib/auth";

type ChatWidgetListItem = {
  id: string; // widgetId
  name?: string;
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
  // Prefer appearance.brandName (your appearance schema)
  const n1 = typeof rec?.appearance?.brandName === "string" ? rec.appearance.brandName.trim() : "";
  if (n1) return n1;

  // Fallbacks (just in case older records differ)
  const n2 = typeof rec?.brandName === "string" ? rec.brandName.trim() : "";
  if (n2) return n2;

  const n3 = typeof rec?.name === "string" ? rec.name.trim() : "";
  if (n3) return n3;

  return "Chat Widget";
}

function sortTs(item: ChatWidgetListItem) {
  const ts = Date.parse(String(item.updatedAt || item.createdAt || ""));
  return Number.isFinite(ts) ? ts : 0;
}

// GET /chat-widget/list
export async function chatWidgetListHandler(req: Request, env: Env) {
  try {
    if (req.method !== "GET") {
      return jsonResponse({ success: false, error: "Method not allowed" }, 405);
    }

    const session = await requireCompany(env, req);
    if (!session?.companyId) {
      return jsonResponse({ success: false, error: "Unauthorized" }, 401);
    }

    // IMPORTANT: must match appearance get/create/update key prefix
    // appearanceCreate.ts uses: chat_widget_appearance:${companyId}:${widgetId}
    const prefix = `chat_widget_appearance:${session.companyId}:`;

    const list: ChatWidgetListItem[] = [];

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
