import type { Env } from "../../index";
import { jsonResponse } from "../_lib/utils";
import { requireCompany } from "../../_lib/auth";

/**
 * Inline hex color validator
 * (kept local on purpose — no shared imports)
 */
function isValidHexColor(value?: string) {
  if (!value || typeof value !== "string") return false;
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value);
}

export async function chatPageCreateHandler(
  req: Request,
  env: Env
) {
  try {
    // -----------------------------
    // Method guard
    // -----------------------------
    if (req.method !== "POST") {
      return jsonResponse(
        { success: false, error: "Method not allowed" },
        405
      );
    }

    // -----------------------------
    // Auth (same as widget)
    // -----------------------------
    const session = await requireCompany(env, req);
    if (!session?.companyId) {
      return jsonResponse(
        { success: false, error: "Unauthorized" },
        401
      );
    }

    // -----------------------------
    // Payload parsing
    // -----------------------------
    const body = await req.json().catch(() => null);
    if (!body?.widgetId || !body?.theme?.accentColor) {
      return jsonResponse(
        { success: false, error: "Invalid payload" },
        400
      );
    }

    // -----------------------------
    // Validation (inline, strict)
    // -----------------------------
    if (
      body.appearance?.backgroundMode === "solid" &&
      !isValidHexColor(body.appearance?.backgroundColor)
    ) {
      return jsonResponse(
        { success: false, error: "Invalid backgroundColor" },
        400
      );
    }

    if (!isValidHexColor(body.theme.accentColor)) {
      return jsonResponse(
        { success: false, error: "Invalid accentColor" },
        400
      );
    }

    // -----------------------------
    // KV key (MUST match get/update)
    // -----------------------------
    const key = `chat_page:${session.companyId}:${body.widgetId}`;

    // -----------------------------
    // Existence check (same pattern)
    // -----------------------------
    const existing = await env.KV.get(key);
    if (existing) {
      return jsonResponse(
        { success: false, error: "Chat page already exists" },
        409
      );
    }

    const now = new Date().toISOString();

    // -----------------------------
    // Record
    // -----------------------------
    const record = {
      widgetId: body.widgetId,
      companyId: session.companyId,

      branding: body.branding ?? {},

      appearance: {
        backgroundMode: body.appearance?.backgroundMode ?? "widget",
        backgroundColor: body.appearance?.backgroundColor,
        backgroundImage: body.appearance?.backgroundImage,
      },

      header: {
        title: body.header?.title ?? "Welcome",
        welcomeMessage: body.header?.welcomeMessage ?? "Ask us anything",
      },

      theme: {
        accentColor: body.theme.accentColor,
        userBubbleColor:
          body.theme.userBubbleColor ?? body.theme.accentColor,
        botBubbleStyle: body.theme.botBubbleStyle ?? "light",
        input: {
          borderColor: body.theme.input?.borderColor,
          focusColor:
            body.theme.input?.focusColor ?? body.theme.accentColor,
          sendButtonColor:
            body.theme.input?.sendButtonColor ?? body.theme.accentColor,
        },
      },

      createdAt: now,
      updatedAt: now,
    };

    // -----------------------------
    // Persist (ONE KV only)
    // -----------------------------
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
