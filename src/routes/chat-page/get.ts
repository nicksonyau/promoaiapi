import type { Env } from "../../index";
import { jsonResponse } from "../_lib/utils";
import { requireCompany } from "../../_lib/auth";

export async function chatPageGetHandler(
  req: Request,
  env: Env,
  widgetId: string
) {
  const traceId = crypto.randomUUID();

  try {
    console.log(`[chat-page/get] start`, {
      traceId,
      method: req.method,
      widgetId,
    });

    // -----------------------------
    // Method guard
    // -----------------------------
    if (req.method !== "GET") {
      console.warn(`[chat-page/get] method not allowed`, {
        traceId,
        method: req.method,
      });

      return jsonResponse(
        { success: false, error: "Method not allowed" },
        405
      );
    }

    // -----------------------------
    // Auth
    // -----------------------------
    const session = await requireCompany(env, req);

    console.log(`[chat-page/get] auth result`, {
      traceId,
      hasSession: !!session,
      companyId: session?.companyId ?? null,
    });

    if (!session?.companyId) {
      console.warn(`[chat-page/get] unauthorized`, { traceId });

      return jsonResponse(
        { success: false, error: "Unauthorized" },
        401
      );
    }

    // -----------------------------
    // Params
    // -----------------------------
    if (!widgetId) {
      console.warn(`[chat-page/get] missing widgetId`, { traceId });

      return jsonResponse(
        { success: false, error: "widgetId required" },
        400
      );
    }

    // -----------------------------
    // KV lookup
    // -----------------------------
    const key = `chat_page:${session.companyId}:${widgetId}`;

    console.log(`[chat-page/get] kv lookup`, {
      traceId,
      key,
    });

    const data = await env.KV.get(key, "json");

    if (!data) {
      console.log(`[chat-page/get] record not found`, {
        traceId,
        key,
      });

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

    return jsonResponse(
      { success: false, error: e?.message || "Server error" },
      500
    );
  }
}
