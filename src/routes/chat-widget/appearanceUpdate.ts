import { Env } from "../../index";
import { jsonResponse } from "../_lib/utils";
import { requireCompany } from "../../_lib/auth";

export async function chatWidgetAppearanceUpdateHandler(
  req: Request,
  env: Env,
  widgetId: string
) {
  try {
    // -----------------------------
    // Method guard
    // -----------------------------
    if (req.method !== "PUT") {
      return jsonResponse(
        { success: false, error: "Method not allowed" },
        405
      );
    }

    // -----------------------------
    // Auth (reused, tested)
    // -----------------------------
    const session = await requireCompany(env, req);
    if (!session?.companyId) {
      return jsonResponse(
        { success: false, error: "Unauthorized" },
        401
      );
    }

    // -----------------------------
    // Parse body
    // -----------------------------
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || !body.appearance) {
      return jsonResponse(
        { success: false, error: "Invalid payload" },
        400
      );
    }

    // -----------------------------
    // 🔒 STORAGE CONTRACT (MATCH CREATE / GET)
    // -----------------------------
    const key = `chat_widget_appearance:${session.companyId}:${widgetId}`;

    const existing = await env.KV.get(key, "json");
    if (!existing) {
      return jsonResponse(
        { success: false, error: "Widget appearance not found" },
        404
      );
    }

    // -----------------------------
    // Safe merge (no schema guessing)
    // -----------------------------
    const record = {
      ...existing,
      appearance: body.appearance,
      starters: Array.isArray(body.starters)
        ? body.starters
        : Array.isArray(existing.starters)
        ? existing.starters
        : [],
      updatedAt: new Date().toISOString(),
    };

    await env.KV.put(key, JSON.stringify(record));

    return jsonResponse({ success: true });
  } catch (e: any) {
    console.error("[chat-widget:update]", e);
    return jsonResponse(
      { success: false, error: e?.message || "Server error" },
      500
    );
  }
}
