import { Env } from "../../index";
import { jsonResponse } from "../../_lib/utils";
import { auth } from "../../_lib/auth";

export async function chatbotSourceAddHandler(req: Request, env: Env) {
  try {
    if (req.method !== "POST") {
      return jsonResponse({ success: false, error: "Method not allowed" }, 405);
    }

    const session = await auth(env, req);
    if (!session || !session.companyId) {
      return jsonResponse({ success: false, error: "Unauthorised" }, 401);
    }

    const { chatbotId, url } = await req.json();

    if (!chatbotId || !url) {
      return jsonResponse({ success: false, error: "Missing chatbotId or url" }, 400);
    }

    const sourceId = crypto.randomUUID();
    const companyId = session.companyId;

    const record = {
      id: sourceId,
      chatbotId,
      companyId,
      url,
      status: "pending",
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    // Save source
    const sourceKey = `chatbot:source:${sourceId}`;
    await env.chatbotconfig.put(sourceKey, JSON.stringify(record));

    // Index by chatbot
    const listKey = `chatbot:sources:${chatbotId}`;
    const existing = (await env.chatbotconfig.get(listKey, { type: "json" })) || [];

    await env.chatbotconfig.put(listKey, JSON.stringify([...existing, sourceId]));

    return jsonResponse({ success: true, id: sourceId }, 201);

  } catch (err: any) {
    console.error("[SOURCE_ADD]", err);
    return jsonResponse({ success: false, error: err.message }, 500);
  }
}
