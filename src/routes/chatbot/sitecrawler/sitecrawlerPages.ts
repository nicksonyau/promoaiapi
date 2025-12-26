import { Env } from "../../../index";
import { jsonResponse } from "../../_lib/utils";
import { auth } from "../../../_lib/auth";

export async function chatbotSitecrawlerPagesHandler(req: Request, env: Env) {

  console.log("🟢 [SITECRAWLER_PAGES]");

  const session = await auth(env, req);
  if (!session?.companyId)
    return jsonResponse({ success: false, error: "Unauthorized" }, 401);

  const siteId = new URL(req.url).pathname.split("/").pop();
  if (!siteId)
    return jsonResponse({ success: false, error: "Missing siteId" }, 400);

  const siteKey = `chatbot:sitecrawler:site:${siteId}`;
  const contentKey = `chatbot:sitecrawler:content:${siteId}`;

  const siteRaw = await env.chatbotconfig.get(siteKey);
  if (!siteRaw) return jsonResponse({ success: false, error: "Site not found" }, 404);

  const site = JSON.parse(siteRaw);
  if (site.companyId !== session.companyId)
    return jsonResponse({ success: false, error: "Forbidden" }, 403);

  const raw = await env.chatbotconfig.get(contentKey);
  if (!raw) return jsonResponse({ success: true, pages: [] });

  const content = JSON.parse(raw);

  console.log("✅ Pages returned:", content.pages?.length || 0);

  return jsonResponse({
    success: true,
    pages: content.pages || []
  });
}
