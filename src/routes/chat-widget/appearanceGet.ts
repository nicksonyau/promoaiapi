import { jsonResponse } from "../../_lib/utils";
import { Env } from "../../index";
import { requireCompany } from "../../_lib/auth";

function safeStr(v: any) {
  return typeof v === "string" ? v.trim() : "";
}

export async function chatWidgetAppearanceGetHandler(
  req: Request,
  env: Env,
  widgetId: string
) {
  try {
    if (req.method !== "GET") {
      return jsonResponse(
        { success: false, error: "Method not allowed" },
        405
      );
    }

    const wid = safeStr(widgetId);
    if (!wid) {
      return jsonResponse({ success: false, error: "Missing widgetId" }, 400);
    }

    // -----------------------------
    // Auth first (dashboard behavior unchanged)
    // -----------------------------
    const session = await requireCompany(env, req).catch(() => null);

    // -----------------------------
    // ✅ Fallback for public embed:
    // If no session, accept companyId from querystring
    // -----------------------------
    let companyId = safeStr(session?.companyId);
    if (!companyId) {
      const url = new URL(req.url);
      companyId = safeStr(url.searchParams.get("companyId"));
    }

    console.log("[chat-widget:get] session/fallback", {
      companyId: companyId || null,
      widgetId: wid,
      hasSession: !!session?.companyId,
    });

    if (!companyId) {
      console.warn("[chat-widget:get] unauthorized request");
      return jsonResponse({ success: false, error: "Unauthorized" }, 401);
    }

    // ✅ MUST MATCH CREATE / UPDATE
    const key = `chat_widget_appearance:${companyId}:${wid}`;
    console.log("[chat-widget:get] KV key", key);

    const parsed: any = await env.KV.get(key, "json");

    if (!parsed) {
      console.log("[chat-widget:get] KV miss");
      return jsonResponse({
        success: true,
        data: {
          exists: false,
          appearance: {},
          starters: [],
          updatedAt: null,
        },
      });
    }

    console.log("[chat-widget:get] KV hit", {
      hasAppearance: !!parsed.appearance,
      startersCount: Array.isArray(parsed.starters) ? parsed.starters.length : 0,
      updatedAt: parsed.updatedAt || null,
    });

    return jsonResponse({
      success: true,
      data: {
        exists: true,
        appearance: parsed.appearance || {},
        starters: Array.isArray(parsed.starters) ? parsed.starters : [],
        updatedAt: parsed.updatedAt || null,
      },
    });
  } catch (e: any) {
    console.error("[chat-widget:get] ERROR", e);
    return jsonResponse(
      { success: false, error: e?.message || "Server error" },
      500
    );
  }
}
