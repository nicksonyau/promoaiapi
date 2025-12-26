import { Env } from "../../index";
import { jsonResponse } from "../_lib/utils";
import { auth } from "../../_lib/auth";

export async function chatbotHistorySession(
  req: Request,
  env: Env,
  chatbotId: string,
  sessionId: string
) {
  try {
    if (req.method !== "GET") {
      return jsonResponse({ success: false, error: "Method not allowed" }, 405);
    }

    const session = await auth(env, req);
    if (!session?.companyId) {
      return jsonResponse({ success: false, error: "Unauthorized" }, 401);
    }

    if (!chatbotId || !sessionId) {
      return jsonResponse(
        { success: false, error: "Missing chatbotId or sessionId" },
        400
      );
    }

    // -------------------------
    // LOAD CHAT
    // -------------------------
    const historyKey = `chat:${chatbotId}:${sessionId}`;
    const raw = await env.CHAT_HISTORY_KV.get(historyKey);

    if (!raw) {
      return jsonResponse({
        success: true,
        chat: []
      });
    }

    let chat;
    try {
      chat = JSON.parse(raw);
    } catch {
      chat = [];
    }

    return jsonResponse({
      success: true,
      chat
    });
  } catch (err: any) {
    console.error("[CHAT_HISTORY_SESSION]", err);
    return jsonResponse(
      { success: false, error: err.message || "Failed to load chat" },
      500
    );
  }
}
