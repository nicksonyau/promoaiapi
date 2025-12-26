import { Env } from "../../../index";
import { jsonResponse } from "../../_lib/utils";
import { auth } from "../../../_lib/auth";

export async function chatbotSitecrawlerClearHandler(
  req: Request,
  env: Env
): Promise<Response> {
  console.log("🧹 [SITECRAWLER_CLEAR] Request received");

  try {
    // ✅ Use DELETE only
    if (req.method !== "DELETE") {
      return jsonResponse({ success: false, error: "Method not allowed" }, 405);
    }

    const session = await auth(env, req);

    if (!session?.companyId) {
      return jsonResponse({ success: false, error: "Unauthorized" }, 401);
    }

    const siteId = new URL(req.url).pathname.split("/").pop();

    if (!siteId) {
      return jsonResponse({ success: false, error: "Missing siteId" }, 400);
    }

    const siteKey = `chatbot:sitecrawler:site:${siteId}`;
    const pagesKey = `chatbot:sitecrawler:pages:${siteId}`;
    const contentKey = `chatbot:sitecrawler:content:${siteId}`;

    const raw = await env.chatbotconfig.get(siteKey);

    if (!raw) {
      return jsonResponse({ success: false, error: "Site not found" }, 404);
    }

    const site = JSON.parse(raw);

    if (site.companyId !== session.companyId) {
      return jsonResponse({ success: false, error: "Forbidden" }, 403);
    }

    // ✅ DELETE DATA
    await env.chatbotconfig.delete(pagesKey);
    await env.chatbotconfig.delete(contentKey);

    // ✅ RESET STATE
    site.status = "pending";
    site.pagesCrawled = 0;
    site.updatedAt = Date.now();

    await env.chatbotconfig.put(siteKey, JSON.stringify(site));

    console.log("✅ Crawl data cleared:", siteId);

    return jsonResponse({
      success: true,
      siteId,
      message: "Crawl data cleared"
    });

  } catch (err: any) {
    console.error("🔥 [SITECRAWLER_CLEAR]", err);
    return jsonResponse({ success: false, error: err.message }, 500);
  }
}
