import { Env } from "../../../index";
import { jsonResponse } from "../../_lib/utils";
import { auth } from "../../../_lib/auth";

export async function chatbotSitecrawlerListHandler(
  req: Request,
  env: Env
): Promise<Response> {
  console.log("🟢 [SITECRAWLER_LIST] Request received");

  try {
    const session = await auth(env, req);
    console.log("👤 Session:", session);

    if (!session?.companyId) {
      return jsonResponse({ success: false, error: "Unauthorized" }, 401);
    }

    const url = new URL(req.url);
    const chatbotId = url.pathname.split("/").pop();

    console.log("🔍 chatbotId:", chatbotId);

    if (!chatbotId) {
      return jsonResponse({ success: false, error: "Missing chatbotId" }, 400);
    }

    const listKey = `chatbot:sitecrawler:list:${chatbotId}`;
    const ids =
      (await env.chatbotconfig.get(listKey, { type: "json" })) || [];

    console.log("📚 Site IDs:", ids);

    const list = [];

    for (const id of ids as string[]) {
      const raw = await env.chatbotconfig.get(
        `chatbot:sitecrawler:site:${id}`
      );

      if (!raw) {
        console.warn("⚠️ Missing site record:", id);
        continue;
      }

      const site = JSON.parse(raw);
      console.log("📄 Loaded site:", site.id, site.rootUrl);

      if (site.companyId !== session.companyId) {
        console.warn("🚫 Company mismatch:", site.companyId);
        continue;
      }

      list.push(site);
    }

    console.log("✅ Returning sites:", list.length);

    return jsonResponse({ success: true, list }, 200);
  } catch (err: any) {
    console.error("🔥 [SITECRAWLER_LIST] ERROR:", err);
    return jsonResponse({ success: false, error: err?.message }, 500);
  }
}
