import { Env } from "../../index";
import { jsonResponse } from "../_lib/utils";
import { requireCompany } from "../../_lib/auth";

export async function chatWidgetAppearanceCreateHandler(
  req: Request,
  env: Env
) {
  try {
    if (req.method !== "POST") {
      return jsonResponse(
        { success: false, error: "Method not allowed" },
        405
      );
    }

    const session = await requireCompany(env, req);
    if (!session?.companyId) {
      return jsonResponse(
        { success: false, error: "Unauthorized" },
        401
      );
    }

    const body = await req.json().catch(() => null);
    if (!body?.widgetId || !body?.appearance) {
      return jsonResponse(
        { success: false, error: "Invalid payload" },
        400
      );
    }

    // ✅ MUST MATCH GET / UPDATE
    const key = `chat_widget_appearance:${session.companyId}:${body.widgetId}`;

    // ✅ Use SAME KV namespace
    const existing = await env.KV.get(key);
    if (existing) {
      return jsonResponse(
        { success: false, error: "Widget appearance already exists" },
        409
      );
    }

    const record = {
      widgetId: body.widgetId,
      companyId: session.companyId,
      appearance: body.appearance,
      starters: Array.isArray(body.starters) ? body.starters : [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await env.KV.put(key, JSON.stringify(record));

    return jsonResponse({
      success: true,
      data: {
        widgetId: body.widgetId,
      },
    });
  } catch (e: any) {
    return jsonResponse(
      { success: false, error: e?.message || "Server error" },
      500
    );
  }
}
