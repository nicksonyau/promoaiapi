import type { Env } from "../../index";
import { jsonResponse } from "../_lib/utils";
import { requireCompany } from "../../_lib/auth";

/**
 * Inline hex color validator
 * (kept local — no shared imports)
 */
function isValidHexColor(value?: string) {
  if (!value || typeof value !== "string") return false;
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value);
}

function isObj(v: any): v is Record<string, any> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

export async function chatPageUpdateHandler(
  req: Request,
  env: Env,
  widgetId: string
) {
  try {
    if (req.method !== "PUT") {
      return jsonResponse({ success: false, error: "Method not allowed" }, 405);
    }

    const session = await requireCompany(env, req);
    if (!session?.companyId) {
      return jsonResponse({ success: false, error: "Unauthorized" }, 401);
    }

    if (!widgetId) {
      return jsonResponse({ success: false, error: "widgetId required" }, 400);
    }

    const key = `chat_page:${session.companyId}:${widgetId}`;
    const rawExisting = await env.KV.get(key, "json");

    if (!rawExisting || !isObj(rawExisting)) {
      return jsonResponse({ success: false, error: "Chat page not found" }, 404);
    }

    const body = await req.json().catch(() => null);
    if (!body || !isObj(body)) {
      return jsonResponse({ success: false, error: "Invalid payload" }, 400);
    }

    // -----------------------------
    // Validation (ONLY if provided)
    // -----------------------------
    if (body.appearance?.backgroundMode === "solid") {
      // backgroundColor must be present and valid in solid mode
      if (!isValidHexColor(body.appearance?.backgroundColor)) {
        return jsonResponse({ success: false, error: "Invalid backgroundColor" }, 400);
      }
    }

    if (body.theme?.accentColor && !isValidHexColor(body.theme.accentColor)) {
      return jsonResponse({ success: false, error: "Invalid accentColor" }, 400);
    }

    if (body.theme?.userBubbleColor && !isValidHexColor(body.theme.userBubbleColor)) {
      return jsonResponse({ success: false, error: "Invalid userBubbleColor" }, 400);
    }

    if (body.theme?.input?.borderColor && !isValidHexColor(body.theme.input.borderColor)) {
      return jsonResponse({ success: false, error: "Invalid input.borderColor" }, 400);
    }

    if (body.theme?.input?.focusColor && !isValidHexColor(body.theme.input.focusColor)) {
      return jsonResponse({ success: false, error: "Invalid input.focusColor" }, 400);
    }

    if (body.theme?.input?.sendButtonColor && !isValidHexColor(body.theme.input.sendButtonColor)) {
      return jsonResponse({ success: false, error: "Invalid input.sendButtonColor" }, 400);
    }

    const existing = rawExisting as any;

    // -----------------------------
    // Merge (non-destructive)
    // -----------------------------
    const updated = {
      ...existing,

      branding: {
        ...(isObj(existing.branding) ? existing.branding : {}),
        ...(isObj(body.branding) ? body.branding : {}),
      },

      appearance: {
        ...(isObj(existing.appearance) ? existing.appearance : {}),
        ...(isObj(body.appearance) ? body.appearance : {}),
      },

      header: {
        ...(isObj(existing.header) ? existing.header : {}),
        ...(isObj(body.header) ? body.header : {}),
      },

      theme: {
        ...(isObj(existing.theme) ? existing.theme : {}),
        ...(isObj(body.theme) ? body.theme : {}),
        input: {
          ...(isObj(existing.theme?.input) ? existing.theme.input : {}),
          ...(isObj(body.theme?.input) ? body.theme.input : {}),
        },
      },

      updatedAt: new Date().toISOString(),
    };

    await env.KV.put(key, JSON.stringify(updated));

    return jsonResponse({
      success: true,
      data: { widgetId },
    });
  } catch (e: any) {
    return jsonResponse(
      { success: false, error: e?.message || "Server error" },
      500
    );
  }
}
