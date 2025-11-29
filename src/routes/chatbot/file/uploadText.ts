// routes/chatbot/file/uploadText.ts

import { auth } from "../../../_lib/auth";
import { jsonResponse } from "../../_lib/utils";
import { nanoid } from "nanoid";
import { Env } from "../../index";

export async function chatbotFileTextUploadHandler(req: Request, env: Env) {
  const session = await auth(env, req);
  if (!session?.companyId) return jsonResponse({ error: "Unauthorized" }, 401);

  const contentType = req.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    return jsonResponse({ error: "Expected multipart/form-data" }, 400);
  }

  const form = await req.formData();

  const file = form.get("file") as File;
  const chatbotId = form.get("chatbotId")?.toString();
  const filename = form.get("filename")?.toString();
  const size = Number(form.get("size"));
  const extractedText = form.get("text")?.toString();

  if (!file || !chatbotId || !filename || !extractedText) {
    return jsonResponse({ error: "Missing file or text" }, 400);
  }

  const id = nanoid();

  // ✅ STORAGE PATHS
  const pdfKey = `chatbot/${chatbotId}/pdf/${id}/${filename}`;
  const textKey = `chatbot/${chatbotId}/text/${id}/${filename}.txt`;

  console.log("✅ SAVING PDF:", pdfKey);
  console.log("✅ SAVING TEXT:", textKey);
  console.log("📄 TEXT LENGTH:", extractedText.length);

  // ✅ SAVE RAW PDF
  const buffer = await file.arrayBuffer();
  await env.MY_R2_BUCKET.put(pdfKey, buffer, {
    httpMetadata: { contentType: "application/pdf" }
  });

  // ✅ SAVE FULL EXTRACTED TEXT
  await env.MY_R2_BUCKET.put(textKey, extractedText, {
    httpMetadata: { contentType: "text/plain" }
  });

  // ✅ SAVE METADATA
  const record = {
    id,
    chatbotId,
    companyId: session.companyId,
    filename,
    size,
    pdfKey,
    textKey,
    status: "pending",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await env.chatbotconfig.put(`chatbot:file:${id}`, JSON.stringify(record));

  console.log("✅ STORED FILE RECORD:", record);

  return jsonResponse({ success: true, file: record });
}
