import { jsonResponse } from "../../_lib/utils";
import { Env } from "../../index";
import { requireCompany } from "../../_lib/auth";

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

    if (!widgetId) {
      return jsonResponse(
        { success: false, error: "Missing widgetId" },
        400
      );
    }

    const session = await requireCompany(env, req);
    if (!session?.companyId) {
      return jsonResponse(
        { success: false, error: "Unauthorized" },
        401
      );
    }

    const key = `chat_widget_appearance:${session.companyId}:${widgetId}`;

    const parsed = await env.KV.get(key, "json");

    // ✅ KEY CHANGE HERE
    if (!parsed) {
      return jsonResponse({
        success: true,
        data: {
          exists: false,
          appearance: {},
          starters: [],
          updatedAt: null
        }
      });
    }

    return jsonResponse({
      success: true,
      data: {
        exists: true,
        appearance: parsed.appearance || {},
        starters: Array.isArray(parsed.starters)
          ? parsed.starters
          : [],
        updatedAt: parsed.updatedAt || new Date().toISOString()
      }
    });
  } catch (e: any) {
    return jsonResponse(
      { success: false, error: e?.message || "Server error" },
      500
    );
  }
}
