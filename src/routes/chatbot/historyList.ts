import { Env } from "../../index";
import { auth } from "../../_lib/auth";

// ✅ INLINE JSON RESPONSE (NO EXTERNAL DEPENDENCY)
function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function chatbotHistoryList(
  req: Request,
  env: Env,
  chatbotId: string
) {
  try {
    if (req.method !== "GET") {
      return jsonResponse({ success: false, error: "Method not allowed" }, 405);
    }

    const session = await auth(env, req);
    if (!session?.companyId) {
      return jsonResponse({ success: false, error: "Unauthorized" }, 401);
    }

    const indexKey = `chat:index:${chatbotId}`;

    const index =
      (await env.CHAT_HISTORY_KV.get(indexKey, { type: "json" })) || [];

    console.log("📜 HISTORY INDEX", index);

    return jsonResponse({
      success: true,
      chatbotId,
      sessions: Array.isArray(index)
        ? index.sort((a: any, b: any) => b.ts - a.ts)
        : [],
    });

  } catch (err: any) {
    console.error("❌ [CHATBOT HISTORY ERROR]", err);
    return jsonResponse({
      success: false,
      error: err?.message || "Internal Server Error",
    }, 500);
  }
}
