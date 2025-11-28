// src/routes/public/chatbotConfig.ts
import { jsonResponse } from "../../_lib/utils";

export async function publicChatbotConfig(req, env) {
  const url = new URL(req.url);
  const chatbotId = url.searchParams.get("chatbotId");

  if (!chatbotId)
    return jsonResponse({ success: false, error: "chatbotId required" }, 400);

  const raw = await env.chatbotconfig.get(`config:${chatbotId}`);
  if (!raw)
    return jsonResponse({ success: false, error: "Chatbot not found" }, 404);

  const config = JSON.parse(raw);

  // Only expose safe public fields
  return jsonResponse({
    success: true,
    config: {
      companyId: config.companyId,
      welcomeMessage: config.defaultGreeting || "",
      quickMenu: config.quickMenu || "",
    },
  });
}
