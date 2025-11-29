// src/routes/chatbot/file/askGPT.ts

import { jsonResponse } from "../../_lib/utils";
import { auth } from "../../../_lib/auth";
import { Env } from "../../../index";

interface AskBody {
  question: string;
}

export async function chatbotFileAskGPTHandler(
  req: Request,
  env: Env,
  id: string
) {
  console.log("\n==============================================");
  console.log("💬 CHATGPT FILE QUESTION START");
  console.log("==============================================");

  // -----------------------------------------------------
  // AUTH
  // -----------------------------------------------------
  const session = await auth(env, req);
  console.log("👤 Session:", session?.companyId || "NOT AUTHENTICATED");

  if (!session?.companyId) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  // -----------------------------------------------------
  // PARSE BODY
  // -----------------------------------------------------
  let body: AskBody;
  try {
    body = (await req.json()) as AskBody;
  } catch (err) {
    console.error("❌ Invalid JSON body:", err);
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const question = body.question?.trim();
  console.log("❓ Question:", question);

  if (!question) {
    return jsonResponse({ error: "Question is required" }, 400);
  }

  // -----------------------------------------------------
  // LOAD FILE METADATA
  // -----------------------------------------------------
  const key = `chatbot:file:${id}`;
  console.log("📦 Fetching file record:", key);

  const file: any = await env.chatbotconfig.get(key, { type: "json" });
  console.log("🗂️ File record:", file);

  if (!file) {
    return jsonResponse({ error: "File not found" }, 404);
  }

  if (file.companyId !== session.companyId) {
    return jsonResponse({ error: "Forbidden" }, 403);
  }

  if (!file.openaiFileId) {
    return jsonResponse({ error: "openaiFileId missing. Upload to GPT first." }, 400);
  }

  console.log("📁 openaiFileId:", file.openaiFileId);

  // -----------------------------------------------------
  // PROXY CONFIGURATION
  // -----------------------------------------------------
  const OPENAI_PROXY_BASE =
    (env as any).OPENAI_PROXY_BASE ||
    "https://companies-officials-trustees-upgrades.trycloudflare.com";

  const OPENAI_MODEL = (env as any).OPENAI_GPT_MODEL || "gpt-4.1-mini";

  // ✅ Shared-secret for your Node proxy
  const PROXY_SHARED_SECRET =
    (env as any).OPENAI_PROXY_SECRET || "PROMOHUBAI_SHARED_SECRET_123";

  console.log("🌍 Using proxy base:", OPENAI_PROXY_BASE);
  console.log("🤖 Using model:", OPENAI_MODEL);

  // -----------------------------------------------------
  // BUILD FILE SEARCH PAYLOAD (RAG)
  // -----------------------------------------------------
  const payload = {
    model: OPENAI_MODEL,
    input: question,
    attachments: [
      {
        file_id: file.openaiFileId,
        tools: [{ type: "file_search" }]
      }
    ],
    // max_output_tokens: 512
  };

  console.log("📤 Sending RAG payload to OpenAI via proxy");
  console.log("📦 Payload:", JSON.stringify(payload, null, 2));

  // -----------------------------------------------------
  // CALL OPENAI USING YOUR SECURED PROXY
  // -----------------------------------------------------
  const res = await fetch(`${OPENAI_PROXY_BASE}/v1/responses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-shared-secret": PROXY_SHARED_SECRET // ✅ PROXY AUTH ADDED
    },
    body: JSON.stringify(payload)
  });

  let data: any;
  try {
    data = await res.json();
  } catch (err) {
    console.error("❌ Invalid JSON from OpenAI:", err);
    return jsonResponse({ error: "Invalid OpenAI response" }, 500);
  }

  console.log("🌐 OpenAI Status:", res.status);
  console.log("📥 OpenAI Response:", JSON.stringify(data, null, 2));

  if (!res.ok) {
    console.error("❌ OpenAI RAG error:", data);
    return jsonResponse(
      { error: data.error?.message || "OpenAI error" },
      500
    );
  }

  // -----------------------------------------------------
  // SAFELY EXTRACT ANSWER TEXT
  // -----------------------------------------------------
  let answer = "";

  try {
    const output = data?.output?.[0];
    const content = output?.content?.[0];

    if (content?.type === "output_text") {
      answer = content.text || "";
    } else if (typeof content === "string") {
      answer = content;
    } else if (typeof output === "string") {
      answer = output;
    } else {
      answer = JSON.stringify(data);
    }
  } catch (err) {
    console.error("⚠️ Parse failure:", err);
    answer = JSON.stringify(data);
  }

  console.log("📝 FINAL ANSWER:", answer);

  console.log("==============================================");
  console.log("✅ CHATGPT FILE QUESTION COMPLETE");
  console.log("==============================================\n");

  return jsonResponse({
    success: true,
    fileId: id,
    openaiFileId: file.openaiFileId,
    question,
    answer,
    raw: data // remove in production if desired
  });
}
