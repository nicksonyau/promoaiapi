import { Env } from "../../../index";
import { jsonResponse } from "../../_lib/utils";
import { auth } from "../../../_lib/auth";
import { SiteRecord } from "./_types";

export async function chatbotSitecrawlerDeleteHandler(req: Request, env: Env) {
  try {
    if (req.method !== "DELETE")
      return jsonResponse({ success: false, error: "Method not allowed" }, 405);

    const session = await auth(env, req);
    if (!session?.companyId)
      return jsonResponse({ success: false, error: "Unauthorized" }, 401);

    const siteId = new URL(req.url).pathname.split("/").pop();
    if (!siteId)
      return jsonResponse({ success: false, error: "Missing siteId" }, 400);

    const siteKey = `chatbot:sitecrawler:site:${siteId}`;
    const raw = await env.chatbotconfig.get(siteKey);
    if (!raw) return jsonResponse({ success: true }, 200); // idempotent

    const site = JSON.parse(raw) as SiteRecord;
    if (site.companyId !== session.companyId)
      return jsonResponse({ success: false, error: "Forbidden" }, 403);

    // remove from list
    const listKey = `chatbot:sitecrawler:list:${site.chatbotId}`;
    const ids = (await env.chatbotconfig.get(listKey, { type: "json" })) || [];
    const next = (ids as string[]).filter((x) => x !== siteId);
    await env.chatbotconfig.put(listKey, JSON.stringify(next));

    // delete all data
    await env.chatbotconfig.delete(siteKey);
    await env.chatbotconfig.delete(`chatbot:sitecrawler:pages:${siteId}`);
    await env.chatbotconfig.delete(`chatbot:sitecrawler:content:${siteId}`);

    return jsonResponse({ success: true }, 200);
  } catch (e: any) {
    return jsonResponse({ success: false, error: e?.message }, 500);
  }
}
