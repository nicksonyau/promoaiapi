import { jsonResponse } from "../../_lib/utils";
import { auth } from "../../../_lib/auth";
import { Env } from "../../../index";

export async function chatbotFileUploadToGPTHandler(req: Request, env: Env, id: string) {

  console.log("\n==============================================");
  console.log("🤖 CHATGPT FILE UPLOAD START");
  console.log("==============================================");

  // -----------------------------------------------------
  // AUTH
  // -----------------------------------------------------
  const session = await auth(env, req);
  console.log("👤 Session:", session?.companyId || "NOT AUTHENTICATED");

  if (!session?.companyId)
    return jsonResponse({ error: "Unauthorized" }, 401);

  // -----------------------------------------------------
  // LOAD FILE METADATA
  // -----------------------------------------------------
  const key = `chatbot:file:${id}`;
  console.log("📦 Fetching file record:", key);

  const file: any = await env.chatbotconfig.get(key, { type: "json" });
  console.log("🗂️ File record:", file);

  if (!file)
    return jsonResponse({ error: "File not found" }, 404);

  if (file.companyId !== session.companyId)
    return jsonResponse({ error: "Forbidden" }, 403);

  // -----------------------------------------------------
  // REQUIRED FIELDS CHECK
  // -----------------------------------------------------
  if (!file.pdfKey)
    return jsonResponse({ error: "pdfKey missing in file record" }, 500);

  console.log("📑 PDF Key:", file.pdfKey);

  // -----------------------------------------------------
  // HARD-CODED OPENAI KEY (TEST ONLY)
  // -----------------------------------------------------
  const OPENAI_API_KEY = "";
  if (!OPENAI_API_KEY || !OPENAI_API_KEY.startsWith("sk-")) {
    console.error("❌ INVALID OPENAI KEY");
    return jsonResponse({ error: "Invalid OpenAI API key" }, 500);
  }

  console.log("🔑 OpenAI key loaded:", OPENAI_API_KEY.slice(0, 8) + "...");

  // -----------------------------------------------------
  // LOAD RAW PDF FROM R2
  // -----------------------------------------------------
  console.log("☁️ Loading RAW PDF from R2:", file.pdfKey);

  if (!env.MY_R2_BUCKET)
    return jsonResponse({ error: "R2 binding missing" }, 500);

  const obj = await env.MY_R2_BUCKET.get(file.pdfKey);

  if (!obj) {
    console.error("❌ PDF not found in R2:", file.pdfKey);
    return jsonResponse({ error: "PDF not found in R2" }, 404);
  }

  const pdfBuffer = await obj.arrayBuffer();
  console.log("📄 PDF size:", pdfBuffer.byteLength, "bytes");

  if (pdfBuffer.byteLength === 0)
    return jsonResponse({ error: "PDF file is empty" }, 400);

  // -----------------------------------------------------
  // PREPARE FILE FOR OPENAI
  // -----------------------------------------------------
  console.log("📤 Preparing raw PDF for OpenAI...");

  const blob = new Blob([pdfBuffer], { type: "application/pdf" });

  const form = new FormData();
  form.append("file", blob, file.filename);
  form.append("purpose", "assistants");

  // -----------------------------------------------------
  // UPLOAD TO OPENAI
  // -----------------------------------------------------
  console.log("🚀 Uploading PDF to OpenAI...");

  const res = await fetch("https://companies-officials-trustees-upgrades.trycloudflare.com/v1/files", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: form
  });

  const data = await res.json();

  console.log("🌐 OpenAI Status:", res.status);
  console.log("📥 OpenAI Response:", JSON.stringify(data, null, 2));

  if (!res.ok) {
    console.error("❌ OpenAI upload failed:", data);
    return jsonResponse({ error: data.error?.message || "OpenAI upload error" }, 500);
  }

  console.log("✅ OPENAI FILE ID:", data.id);

  // -----------------------------------------------------
  // SAVE OPENAI FILE ID TO KV
  // -----------------------------------------------------
  file.openaiFileId = data.id;
  file.updatedAt = Date.now();

  await env.chatbotconfig.put(key, JSON.stringify(file));

  console.log("💾 KV updated with openaiFileId");
  console.log("==============================================");
  console.log("✅ CHATGPT FILE UPLOAD COMPLETE");
  console.log("==============================================\n");

  return jsonResponse({
    success: true,
    openaiFileId: data.id
  });
}
