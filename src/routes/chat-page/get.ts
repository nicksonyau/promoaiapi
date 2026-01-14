import type { Env } from "../../index";
import { jsonResponse } from "../_lib/utils";
import { requireCompany } from "../../_lib/auth";

function readCompanyIdFromQuery(req: Request): string {
  try {
    const u = new URL(req.url);
    return (u.searchParams.get("companyId") || "").trim();
  } catch {
    return "";
  }
}

function normalizeId(id: any): string {
  return typeof id === "string" ? id.trim() : "";
}

export async function chatPageGetHandler(
  req: Request,
  env: Env,
  id: string // route param (chatPageId)
) {
  const traceId = crypto.randomUUID();

  try {
    const chatPageId = normalizeId(id);

    console.log(`[chat-page/get] start`, {
      traceId,
      method: req.method,
      chatPageId,
    });

    if (req.method !== "GET") {
      console.warn(`[chat-page/get] method not allowed`, {
        traceId,
        method: req.method,
      });
      return jsonResponse({ success: false, error: "Method not allowed" }, 405);
    }

    if (!chatPageId) {
      console.warn(`[chat-page/get] missing chatPageId`, { traceId });
      return jsonResponse({ success: false, error: "chatPageId required" }, 400);
    }

    // -----------------------------
    // Auth (dashboard) OR public fallback
    // -----------------------------
    const session = await requireCompany(env, req);
    const companyIdFromSession = (session?.companyId || "").trim();
    const companyIdFromQuery = readCompanyIdFromQuery(req);

    const companyId = companyIdFromSession || companyIdFromQuery;

    console.log(`[chat-page/get] auth result`, {
      traceId,
      hasSession: !!session,
      companyIdFromSession: companyIdFromSession || null,
      companyIdFromQuery: companyIdFromQuery || null,
      resolvedCompanyId: companyId || null,
    });

    if (!companyId) {
      console.warn(`[chat-page/get] unauthorized (no session + no companyId query)`, { traceId });
      return jsonResponse({ success: false, error: "Unauthorized" }, 401);
    }

    // -----------------------------
    // KV lookup (MUST MATCH create/update)
    // -----------------------------
    const key = `chat_page:${companyId}:${chatPageId}`;

    console.log(`[chat-page/get] kv lookup`, { traceId, key });

    const data = await env.KV.get(key, "json");

    if (!data) {
      console.log(`[chat-page/get] record not found`, { traceId, key });
      return jsonResponse({
        success: true,
        exists: false,
        data: null,
      });
    }

    console.log(`[chat-page/get] record found`, {
      traceId,
      key,
      updatedAt: (data as any)?.updatedAt ?? null,
    });

    return jsonResponse({
      success: true,
      exists: true,
      data,
    });
  } catch (e: any) {
    console.error(`[chat-page/get] fatal error`, {
      traceId,
      message: e?.message,
      stack: e?.stack,
    });

    return jsonResponse({ success: false, error: e?.message || "Server error" }, 500);
  }
}
