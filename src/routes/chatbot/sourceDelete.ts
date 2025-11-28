import { Env } from "../../index";
import { jsonResponse } from "../../_lib/utils";
import { auth } from "../../_lib/auth";

export async function chatbotSourceDeleteHandler(req: Request, env: Env, id: string) {
  try {
    if (req.method !== "DELETE") {
      return jsonResponse({ success: false, error: "Method not allowed" }, 405);
    }

    const session = await auth(env, req);
    if (!session || !session.companyId) {
      return jsonResponse({ success: false, error: "Unauthorised" }, 401);
    }

    if (!id) {
      return jsonResponse({ success: false, error: "Missing source id" }, 400);
    }

    const sourceKey = `chatbot:source:${id}`;
    const source: any = await env.chatbotconfig.get(sourceKey, { type: "json" });

    if (!source) {
      return jsonResponse({ success: true }); // idempotent delete
    }

    // Remove from chatbot index
    const listKey = `chatbot:sources:${source.chatbotId}`;
    const list = (await env.chatbotconfig.get(listKey, { type: "json" })) || [];

    const updated = list.filter((x: string) => x !== id);
    await env.chatbotconfig.put(listKey, JSON.stringify(updated));

    // Delete source
    await env.chatbotconfig.delete(sourceKey);

    return jsonResponse({ success: true });

  } catch (err: any) {
    console.error("[SOURCE_DELETE]", err);
    return jsonResponse({ success: false, error: err.message }, 500);
  }
}
