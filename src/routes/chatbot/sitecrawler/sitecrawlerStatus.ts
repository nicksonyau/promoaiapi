import { Env } from "../../../index";
import { jsonResponse } from "../../_lib/utils";
import { auth } from "../../../_lib/auth";
import { SiteRecord } from "./_types";

export async function chatbotSitecrawlerStatusHandler(req: Request, env: Env) {
  try {
    if (req.method !== "GET")
      return jsonResponse({ success: false, error: "Method not allowed" }, 405);

    const session = await auth(env, req);
    if (!session?.companyId)
      return jsonResponse({ success: false, error: "Unauthorized" }, 401);

    const siteId = new URL(req.url).pathname.split("/").pop();
    if (!siteId)
      return jsonResponse({ success: false, error: "Missing siteId" }, 400);

    const raw = await env.chatbotconfig.get(`chatbot:sitecrawler:site:${siteId}`);
    if (!raw)
      return jsonResponse({ success: false, error: "Not found" }, 404);

    const site = JSON.parse(raw) as SiteRecord;
    if (site.companyId !== session.companyId)
      return jsonResponse({ success: false, error: "Forbidden" }, 403);

    return jsonResponse({ success: true, site }, 200);
  } catch (e: any) {
    return jsonResponse({ success: false, error: e?.message }, 500);
  }
}
