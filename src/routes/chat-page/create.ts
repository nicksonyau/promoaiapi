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

export async function chatPageCreateHandler(req: Request, env: Env) {
  const url = new URL(req.url);

  try {
    console.log(`[chat-page:create] ${req.method} ${url.pathname}`);

    // -----------------------------
    // Method guard
    // -----------------------------
    if (req.method !== "POST") {
      console.log(`[chat-page:create] Method not allowed: ${req.method}`);
      return jsonResponse({ success: false, error: "Method not allowed" }, 405);
    }

    // -----------------------------
    // Auth (same as widget)
    // -----------------------------
    const session = await requireCompany(env, req);
    if (!session?.companyId) {
      console.log(`[chat-page:create] Unauthorized (no companyId)`);
      return jsonResponse({ success: false, error: "Unauthorized" }, 401);
    }

    // -----------------------------
    // Payload parsing
    // -----------------------------
    const body = await req.json().catch(() => null);

    const widgetId = body?.widgetId;
    const accentColor = body?.theme?.accentColor;

    console.log(
      `[chat-page:create] companyId=${session.companyId} widgetId=${String(widgetId || "")}`
    );

    if (!widgetId || !accentColor) {
      console.log(`[chat-page:create] Invalid payload (missing widgetId/accentColor)`);
      return jsonResponse({ success: false, error: "Invalid payload" }, 400);
    }

    // -----------------------------
    // Validation (inline, strict)
    // -----------------------------
    if (
      body.appearance?.backgroundMode === "solid" &&
      !isValidHexColor(body.appearance?.backgroundColor)
    ) {
      console.log(
        `[chat-page:create] Invalid backgroundColor=${String(body.appearance?.backgroundColor)}`
      );
      return jsonResponse({ success: false, error: "Invalid backgroundColor" }, 400);
    }

    if (!isValidHexColor(accentColor)) {
      console.log(`[chat-page:create] Invalid accentColor=${String(accentColor)}`);
      return jsonResponse({ success: false, error: "Invalid accentColor" }, 400);
    }

    // -----------------------------
    // KV key (MUST match get/update)
    // -----------------------------
    const key = `chat_page:${session.companyId}:${widgetId}`;
    
    console.log(`*************************************widgetId=${widgetId}`);
    console.log(`[chat-page:create] KV key=${key}`);
    // -----------------------------
    // Existence check (same pattern)
    // -----------------------------
    const existing = await env.KV.get(key);
    if (existing) {
      console.log(`[chat-page:create] Already exists -> 409`);
      return jsonResponse({ success: false, error: "Chat page already exists" }, 409);
    }

    const now = new Date().toISOString();

    // -----------------------------
    // Record
    // -----------------------------
    const record = {
      widgetId,
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
        accentColor,
        userBubbleColor: body.theme.userBubbleColor ?? accentColor,
        botBubbleStyle: body.theme.botBubbleStyle ?? "light",
        input: {
          borderColor: body.theme.input?.borderColor,
          focusColor: body.theme.input?.focusColor ?? accentColor,
          sendButtonColor: body.theme.input?.sendButtonColor ?? accentColor,
        },
      },
      createdAt: now,
      updatedAt: now,
    };

    // -----------------------------
    // Persist (ONE KV only)
    // -----------------------------
    await env.KV.put(key, JSON.stringify(record));
    console.log(`[chat-page:create] Saved OK widgetId=${widgetId}`);

    return jsonResponse({
      success: true,
      data: { widgetId },
    });
  } catch (e: any) {
    console.log(
      `[chat-page:create] ERROR: ${String(e?.message || e)}\n${e?.stack || ""}`
    );
    return jsonResponse({ success: false, error: e?.message || "Server error" }, 500);
  }
}
