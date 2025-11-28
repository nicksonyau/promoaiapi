// src/routes/chatbot/chat_init.ts
import { Env } from "../../index";

export const chatInitHandler = async (req: Request, env: Env): Promise<Response> => {
  try {
    const url = new URL(req.url);
    const chatbotId = url.searchParams.get("chatbotId");

    if (!chatbotId) {
      return Response.json(
        { success: false, error: "Missing chatbotId" },
        { status: 400 }
      );
    }

    // Load config (PUBLIC)
    const settingsRaw = await env.chatbotconfig.get(`config:${chatbotId}`);
    if (!settingsRaw) {
      return Response.json(
        { success: false, error: "Chatbot config not found" },
        { status: 404 }
      );
    }

    const settings = JSON.parse(settingsRaw);

    return Response.json(
      {
        success: true,
        welcomeMessage: settings.defaultGreeting ?? "Hi! How can I help you?",
        quickMenu: settings.quickMenu ?? ""
      },
      { status: 200 }
    );

  } catch (err: any) {
    console.error("chat_init error:", err);
    return Response.json(
      { success: false, error: err.message ?? "Internal error" },
      { status: 500 }
    );
  }
};
