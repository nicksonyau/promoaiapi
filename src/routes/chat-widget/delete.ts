import type { Env } from "../../index";
import { jsonResponse } from "../_lib/utils";
import { requireCompany } from "../../_lib/auth";

function safeStr(v: any) {
  return typeof v === "string" ? v.trim() : "";
}

async function readBodyJson(req: Request) {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

/**
 * DELETE /chat-widget/delete
 * Accepts widgetId via:
 *  - query: ?widgetId=...
 *  - json body: { widgetId: "..." } (optional fallback)
 *
 * Deletes ONLY the proven KV record:
 *   chat_widget_appearance:${companyId}:${widgetId}
 */
export async function chatWidgetDeleteHandler(req: Request, env: Env) {
  try {
    if (req.method !== "DELETE") {
      return jsonResponse({ success: false, error: "Method not allowed" }, 405);
    }

    const session = await requireCompany(env, req);
    if (!session?.companyId) {
      return jsonResponse({ success: false, error: "Unauthorized" }, 401);
    }

    // widgetId from query first (safe for DELETE), then fallback to JSON body
    const url = new URL(req.url);
    let widgetId = safeStr(url.searchParams.get("widgetId"));

    if (!widgetId) {
      const body = await readBodyJson(req);
      widgetId = safeStr(body?.widgetId);
    }

    if (!widgetId) {
      return jsonResponse({ success: false, error: "Missing widgetId" }, 400);
    }

    // ✅ Proven storage contract (matches create/get/update/list)
    const key = `chat_widget_appearance:${session.companyId}:${widgetId}`;

    // Idempotent delete: report whether record existed
    const existed = !!(await env.KV.get(key));
    if (existed) {
      await env.KV.delete(key);
    }

    return jsonResponse({ success: true, deleted: existed });
  } catch (e: any) {
    return jsonResponse(
      { success: false, error: e?.message || "Server error" },
      500
    );
  }
}
