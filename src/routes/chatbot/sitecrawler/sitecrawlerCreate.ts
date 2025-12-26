import { Env } from "../../../index";
import { jsonResponse } from "../../_lib/utils";
import { auth } from "../../../_lib/auth";

export async function chatbotSitecrawlerClearHandler(
  req: Request,
  env: Env
): Promise<Response> {

  console.log("🟢 [SITECRAWLER_CLEAR] Request received");

  try {
    if (req.method !== "POST") {
      console.warn("⚠️ Method not allowed:", req.method);
      return jsonResponse({ success: false, error: "Method not allowed" }, 405);
    }

    const session = await auth(env, req);
    console.log("👤 Session:", session);

    if (!session?.companyId) {
      return jsonResponse({ success: false, error: "Unauthorised" }, 401);
    }

    const siteId = req.url.split("/").pop();
    console.log("📌 siteId:", siteId);

    if (!siteId) {
      return jsonResponse({ success: false, error: "Missing siteId" }, 400);
    }

    const siteKey = `chatbot:sitecrawler:site:${siteId}`;
    const pagesKey = `chatbot:sitecrawler:pages:${siteId}`;
    const contentKey = `chatbot:sitecrawler:content:${siteId}`;

    // ---- Load site
    const raw = await env.chatbotconfig.get(siteKey);
    console.log("📦 Loaded site:", raw);

    if (!raw) {
      return jsonResponse({ success: false, error: "Site not found" }, 404);
    }

    const site = JSON.parse(raw);

    if (site.companyId !== session.companyId) {
      return jsonResponse({ success: false, error: "Forbidden" }, 403);
    }

    // ---- Delete crawl data only
    await env.chatbotconfig.delete(pagesKey);
    await env.chatbotconfig.delete(contentKey);

    // ---- Reset status
    site.status = "pending";
    site.pagesCrawled = 0;
    site.updatedAt = Date.now();

    await env.chatbotconfig.put(siteKey, JSON.stringify(site));

    console.log("✅ Crawl data cleared:", siteId);

    return jsonResponse({
      success: true,
      message: "Crawl data cleared",
      siteId
    });

  } catch (err: any) {
    console.error("🔥 [SITECRAWLER_CLEAR] ERROR:", err);
    return jsonResponse(
      { success: false, error: err?.message || "Server error" },
      500
    );
  }
}
