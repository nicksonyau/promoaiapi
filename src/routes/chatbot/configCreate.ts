// src/routes/chatbot/configCreate.ts
import { Env } from "../../index";
import { jsonResponse } from "../../_lib/utils";
import { auth } from "../../_lib/auth";

export async function configCreateHandler(req: Request, env: Env) {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      });
    }
    if (req.method !== "POST") {
      return jsonResponse({ success: false, error: "Method not allowed" }, 405);
    }

    const session = await auth(env, req);
    if (!session || !session.companyId) {
      return jsonResponse({ success: false, error: "Unauthorised" }, 401);
    }
    const companyId = session.companyId;

    const body = await req.json();
    const chatbotId = crypto.randomUUID();

    let quickMenu = (body.quickMenu || "")
      .split("\n")
      .map((x: string) => x.trim())
      .filter(Boolean)
      .join("\n");

    if (!quickMenu) {
      quickMenu = `View promotions
      Check products/services
      Opening hours
      Location
      WhatsApp contact
      Make an enquiry
      Best sellers
      Ask a question`.trim();
    }

    const record = {
      ...body,
      quickMenu,
      chatbotId,
      companyId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const key = `config:${chatbotId}`;
    await env.chatbotconfig.put(key, JSON.stringify(record));

    // Index for fast listing – FIXED LINE (removed extra )))
    const indexKey = `chatbots:${companyId}`;
    const existing = (await env.chatbotconfig.get(indexKey, { type: "json" })) || [];
    await env.chatbotconfig.put(indexKey, JSON.stringify([...existing, chatbotId]));

    return jsonResponse({ success: true, id: chatbotId }, 201);
  } catch (err: any) {
    console.error("[CHATBOT_CREATE]", err);
    return jsonResponse({ success: false, error: err.message }, 500);
  }
}