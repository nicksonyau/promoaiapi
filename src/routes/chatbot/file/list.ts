import { jsonResponse } from "../../_lib/utils";
import { auth } from "../../../_lib/auth";

/**
 * List all uploaded files for one chatbot
 */
export async function chatbotFileListHandler(req: Request, env: any, chatbotId: string) {
  console.log("📂 FILE LIST HANDLER HIT");
  console.log("chatbotId:", chatbotId);

  // --------------------------
  // Auth
  // --------------------------
  const session = await auth(env, req);
  console.log("🔐 Session companyId:", session?.companyId);

  if (!session?.companyId) {
    console.log("❌ Unauthorized");
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  // --------------------------
  // Verify KV binding
  // --------------------------
  if (!env.chatbotconfig) {
    console.error("❌ KV binding 'chatbotconfig' missing");
    return jsonResponse({ error: "KV not configured" }, 500);
  }

  // --------------------------
  // List keys
  // --------------------------
  console.log("🔍 Listing KV keys: chatbot:file:*");
  const result = await env.chatbotconfig.list({ prefix: "chatbot:file:" });

  console.log("🔑 Keys found:", result.keys.map(k => k.name));

  const files: any[] = [];

  // --------------------------
  // Load & filter items
  // --------------------------
  for (const k of result.keys) {
    console.log("➡️ Reading key:", k.name);

    const raw = await env.chatbotconfig.get(k.name);
    console.log("📦 Raw record:", raw);

    let row;
    try {
      row = JSON.parse(raw || "null");
    } catch (err) {
      console.warn("⚠️ Invalid JSON:", k.name, err);
      continue;
    }

    // --------------------------
    // Normalize field names
    // --------------------------
    const fileChatbotId =
      row?.chatbotId ||
      row?.chatbot ||
      row?.botId;

    const fileCompanyId =
      row?.companyId ||
      row?.company ||
      row?.tenantId;

    console.log("🔎 Check:", { fileChatbotId, fileCompanyId });

    if (!fileChatbotId || !fileCompanyId) {
      console.warn("⚠️ Bad metadata:", row);
      continue;
    }

    // --------------------------
    // Apply filter
    // --------------------------
    if (fileChatbotId === chatbotId && fileCompanyId === session.companyId) {
      files.push(row);
      console.log("✅ MATCH:", row.id || k.name);
    } else {
      console.log("❌ SKIPPED:", {
        chatbotId: fileChatbotId,
        companyId: fileCompanyId
      });
    }
  }

  console.log("✅ FINAL FILE COUNT:", files.length);

  return jsonResponse({
    success: true,
    list: files
  });
}
