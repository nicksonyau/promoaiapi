// routes/chatbot/file/process.ts

import { jsonResponse } from "../../_lib/utils";
import { auth } from "../../../_lib/auth";
import { Env } from "../../index"; // Assuming Env is exported from index.ts

const MAX_CHUNKS = 100; // hard guardrail to prevent abuse

// ------------------------------------------------------------
// CLOUDFLARE AI EMBEDDING
// ------------------------------------------------------------
async function embed(env: Env, text: string): Promise<number[]> {
  if (!env.AI) throw new Error("Cloudflare AI binding missing.");
  const result = await env.AI.run("@cf/baai/bge-base-en-v1.5", {
    text: [text],
  });
  // Ensure the result format is correct before returning
  if (!result || !result.data || !Array.isArray(result.data[0])) {
      throw new Error("Invalid response format from Cloudflare AI embedding.");
  }
  return result.data[0]; // embedding vector
}

// ------------------------------------------------------------
// TEXT CHUNKING
// ------------------------------------------------------------
function chunk(text: string, size = 900) {
  const out: string[] = [];
  for (let i = 0; i < text.length; i += size) out.push(text.slice(i, i + size));
  return out;
}


export async function chatbotFileProcessHandler(req: Request, env: Env, id: string) {
  console.log("================================");
  console.log("⚙️ FILE PROCESS START:", id);
  console.log("================================");

  // -----------------------
  // AUTH
  // -----------------------
  const session = await auth(env, req);
  if (!session?.companyId)
    return jsonResponse({ error: "Unauthorized" }, 401);

  // -----------------------
  // LOAD METADATA
  // -----------------------
  if (!env.chatbotconfig)
    return jsonResponse({ error: "KV binding missing" }, 500);

  const key = `chatbot:file:${id}`;
  const file: any = await env.chatbotconfig.get(key, { type: "json" });

  console.log("📦 FILE RECORD:", file);

  if (!file) return jsonResponse({ error: "File not found" }, 404);
  if (file.companyId !== session.companyId)
    return jsonResponse({ error: "Access denied" }, 403);

  const fileName = file.name || file.filename || file.originalName || "unknown";
  
  // ✅ NEW: Use textKey to find the extracted text in R2
  const textR2Key = file.textKey; 

  if (!textR2Key) // Check for the presence of the text key
    return jsonResponse({ error: "Extracted text storage path (textKey) missing" }, 500);

  // -----------------------
  // LOAD EXTRACTED TEXT FROM R2 (using textR2Key)
  // -----------------------
  if (!env.MY_R2_BUCKET)
    return jsonResponse({ error: "Storage not configured (R2 missing)" }, 500);

  const obj = await env.MY_R2_BUCKET.get(textR2Key);
  if (!obj)
    return jsonResponse({ error: `Extracted text missing in storage at ${textR2Key}` }, 404);

  const buffer = await obj.arrayBuffer();
  console.log("📄 TEXT BYTES:", buffer.byteLength);

  // -----------------------
  // TEXT EXTRACTION
  // -----------------------
  let text = "";

  try {
    // Decode the R2 buffer which is the UTF-8 text file.
    text = new TextDecoder().decode(buffer);
  } catch (err) {
    return jsonResponse({ error: "Text decode failed" }, 400);
  }
  // LOG THE DECODED TEXT VALUE
  console.log("📄 ==========================DECODED TEXT VALUE:", text);

  if (!text.trim())
    return jsonResponse({ error: "File contains no readable text" }, 400);

  console.log("🧾 TEXT LENGTH:", text.length);

  // -----------------------
  // CHUNKING (using shared chunk logic)
  // -----------------------
  const chunks = chunk(text, 900).slice(0, MAX_CHUNKS);
  console.log("✂️ CHUNKS:", chunks.length);

  // -----------------------
  // CLOUDFLARE AI CHECK
  // -----------------------
  if (!env.AI)
    return jsonResponse({ error: "Cloudflare AI not configured" }, 500);

  // -----------------------
  // EMBEDDINGS (using shared embed logic)
  // -----------------------
  const vectors = [];

  for (let i = 0; i < chunks.length; i++) {
    console.log(`🧠 Embedding ${i + 1}/${chunks.length}`);

    try {
      // Call the shared embed function using Cloudflare AI
      const vector = await embed(env, chunks[i]); 
      
      vectors.push({
        chatbotId: file.chatbotId,
        companyId: file.companyId,
        fileId: id,
        fileName,
        index: i,
        text: chunks[i],
        embedding: vector,
      });
    } catch (e: any) {
      console.error("❌ Embedding failed for chunk:", i, e.message);
      // Fail the whole process and mark file as error
      file.status = "error";
      file.updatedAt = Date.now();
      await env.chatbotconfig.put(key, JSON.stringify(file));
      return jsonResponse({ error: `Embedding service failed: ${e.message}` }, 502);
    }
  }

  console.log("✅ VECTORS:", vectors.length);

  // -----------------------
  // STORE VECTORS
  // -----------------------
  for (let i = 0; i < vectors.length; i++) {
    await env.chatbotconfig.put(
      `chatbot:vector:${file.chatbotId}:${id}:${i}`,
      JSON.stringify(vectors[i])
    );
  }

  // -----------------------
  // FINAL UPDATE
  // -----------------------
  file.status = "indexed";
  file.updatedAt = Date.now();
  file.vectorCount = vectors.length;

  await env.chatbotconfig.put(key, JSON.stringify(file));

  console.log("✅ PROCESS COMPLETE");

  return jsonResponse({
    success: true,
    indexed: true,
    vectors: vectors.length
  });
}