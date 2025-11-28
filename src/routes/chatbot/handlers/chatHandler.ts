// src/routes/chatbot/list.ts
import { Env } from "../../index";
import { jsonResponse } from "../../_lib/utils";
import { auth } from "../../_lib/auth";

export async function listChatbots(req: Request, env: Env) {
  try {
    const session = await auth(env, req);
    if (!session || !session.companyId) {
      return jsonResponse({ success: false, error: "Unauthorised" }, 401);
    }
    const companyId = session.companyId;

    const indexKey = `chatbots:${companyId}`;
    const chatbotIds: string[] = (await env.chatbotconfig.get(indexKey, { type: "json" })) || [];

    const items = [];
    for (const id of chatbotIds) {
      const raw = await env.chatbotconfig.get(`config:${id}`);
      if (!raw) continue;
      const record = JSON.parse(raw);

      items.push({
        id: record.chatbotId,
        businessName: record.businessName || "Unnamed",
        companyId: record.companyId,    // ← THIS WAS MISSING
        updatedAt: record.updatedAt,
        createdAt: record.createdAt,
      });
    }

    return jsonResponse({ success: true, list: items }, 200);
  } catch (err: any) {
    console.error("[CHATBOT_LIST]", err);
    return jsonResponse({ success: false, error: "Failed" }, 500);
  }
}