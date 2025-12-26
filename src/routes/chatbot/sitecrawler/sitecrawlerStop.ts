import { Env } from "../../../index";
import { jsonResponse } from "../../_lib/utils";
import { auth } from "../../../_lib/auth";

export async function chatbotSitecrawlerStopHandler(
  req: Request,
  env: Env
): Promise<Response> {
  try {
    if (req.method !== "POST") {
      return jsonResponse({ success: false, error: "Method not allowed" }, 405);
    }

    const session = await auth(env, req);
    if (!session || !session.companyId) {
      return jsonResponse({ success: false, error: "Unauthorised" }, 401);
    }

    const url = new URL(req.url);
    const parts = url.pathname.split("/");
    // Expect: /chatbot/sitecrawler/stop/:siteId
    const siteId = parts[parts.length - 1];

    if (!siteId) {
      return jsonResponse(
        { success: false, error: "Missing siteId in path" },
        400
      );
    }

    const siteKey = `chatbot:sitecrawler:site:${siteId}`;
    const raw = await env.chatbotconfig.get(siteKey);
    if (!raw) {
      return jsonResponse({ success: false, error: "Site not found" }, 404);
    }

    const site = JSON.parse(raw);
    if (site.companyId !== session.companyId) {
      return jsonResponse({ success: false, error: "Forbidden" }, 403);
    }

    site.status = "stopped";
    site.updatedAt = Date.now();
    await env.chatbotconfig.put(siteKey, JSON.stringify(site));

    return jsonResponse({ success: true }, 200);
  } catch (err: any) {
    console.error("[SITECRAWLER_STOP]", err);
    return jsonResponse(
      { success: false, error: err?.message || "Server error" },
      500
    );
  }
}
