import { jsonResponse } from "../../_lib/utils";
import { listSourcesCore } from "./_shared/sourceListCore";

export async function chatbotSourceListHandler(req: Request, env: any, chatbotId: string) {
  console.log("📂 SOURCE LIST HANDLER");
  console.log("chatbotId:", chatbotId);

  const all = await listSourcesCore(env, chatbotId);
  console.log("✅ All sources:", all);

  // ✅ FIX: Detect URLs by presence of URL field
  const urls = all.filter(x => typeof x?.url === "string" && x.url.startsWith("http"));

  console.log("🌐 URL sources:", urls.length);

  return jsonResponse({ success: true, list: urls });
}
