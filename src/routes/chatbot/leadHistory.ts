import { Env } from "../../index";
import { jsonResponse } from "../../_lib/utils";
import { auth } from "../../_lib/auth";

export async function leadHistory(req: Request, env: Env) {
  try {
    if (req.method !== "GET") {
      return jsonResponse({ success: false, error: "Method not allowed" }, 405);
    }

    const session = await auth(env, req);
    if (!session?.companyId) {
      return jsonResponse({ success: false, error: "Unauthorized" }, 401);
    }

    const url = new URL(req.url);
    const leadId = url.searchParams.get("id");

    if (!leadId) {
      return jsonResponse({ success: false, error: "Missing lead id" }, 400);
    }

    const leadKey = `lead:${session.companyId}:${leadId}`;
    const lead = await env.LEADS_KV.get(leadKey, { type: "json" });

    if (!lead) {
      return jsonResponse({ success: false, error: "Lead not found" }, 404);
    }

    if (!lead.sessionId || !lead.chatbotId) {
      return jsonResponse({
        success: false,
        error: "Lead has no chat history",
        lead,
        chat: []
      });
    }

    const historyKey = `chat:${lead.chatbotId}:${lead.sessionId}`;
    const chat = JSON.parse(
      (await env.CHAT_HISTORY_KV.get(historyKey)) || "[]"
    );

    return jsonResponse({
      success: true,
      lead,
      chat
    });

  } catch (err: any) {
    console.error("[LEAD_HISTORY]", err);
    return jsonResponse({ success: false, error: err.message }, 500);
  }
}
