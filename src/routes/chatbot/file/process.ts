import { jsonResponse } from "../../_lib/utils";
import { auth } from "../../../_lib/auth";

const OPENAI_EMBEDDING_URL = "https://api.openai.com/v1/embeddings";
const EMBEDDING_MODEL = "text-embedding-3-small";

export async function chatbotFileProcessHandler(req: Request, env: any, id: string) {
  console.log("================================");
  console.log("⚙️ PROCESS START:", id);
  console.log("================================");

  // -----------------------
  // 1) AUTH
  // -----------------------
  const session = await auth(env, req);
  if (!session?.companyId) {
    console.log("❌ Unauthorized");
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  // -----------------------
  // 2) LOAD METADATA
  // -----------------------
  if (!env.chatbotconfig) {
    console.log("❌ KV binding missing");
    return jsonResponse({ error: "KV binding missing" }, 500);
  }

  const key = `chatbot:file:${id}`;
  const file = await env.chatbotconfig.get(key, { type: "json" });

  console.log("📦 FILE RECORD:", file);

  if (!file) return jsonResponse({ error: "File not found" }, 404);
  if (file.companyId !== session.companyId)
    return jsonResponse({ error: "Access denied" }, 403);

  // Normalize filename
  const fileName = file.name || file.filename || file.originalName || "unknown";
  const r2Key = file.r2Key;

  if (!r2Key) {
    console.log("❌ Missing r2Key in record");
    return jsonResponse({ error: "File storage path missing" }, 500);
  }

  // -----------------------
  // 3) LOAD FROM R2 (FIXED)
  // -----------------------
  if (!env.MY_R2_BUCKET) {
    console.log("❌ R2 binding missing: env.MY_R2_BUCKET");
    return jsonResponse({ error: "Storage not configured (R2 missing)" }, 500);
  }

  console.log("☁️ LOADING R2:", r2Key);

  const obj = await env.MY_R2_BUCKET.get(r2Key);
  if (!obj) {
    console.log("❌ File missing in R2:", r2Key);
    return jsonResponse({ error: "File missing in storage" }, 404);
  }

  const buffer = await obj.arrayBuffer();
  console.log("📄 File bytes:", buffer.byteLength);

  // -----------------------
  // 4) EXTRACT TEXT
  // -----------------------
  let text = "";
  try {
    text = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
  } catch (err) {
    console.log("❌ Text decode failed", err);
    return jsonResponse({ error: "Cannot decode file content" }, 400);
  }

  if (!text.trim()) {
    console.log("❌ Empty content");
    return jsonResponse({ error: "Empty file" }, 400);
  }

  console.log("🧾 TEXT LENGTH:", text.length);

  // -----------------------
  // 5) CHUNK TEXT
  // -----------------------
  const chunks = chunkText(text, 500);
  console.log("✂️ CHUNKS:", chunks.length);

  // -----------------------
  // 6) VERIFY OPENAI KEY
  // -----------------------
  if (!env.OPENAI_API_KEY) {
    console.log("❌ OPENAI_API_KEY missing");
    return jsonResponse({ error: "OpenAI not configured" }, 500);
  }

  // -----------------------
  // 7) EMBEDDINGS
  // -----------------------
  const vectors = [];

  for (let i = 0; i < chunks.length; i++) {
    console.log(`🧠 Embedding ${i + 1}/${chunks.length}`);

    const res = await fetch(OPENAI_EMBEDDING_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: chunks[i],
      }),
    });

    const data = await res.json();
    const vector = data?.data?.[0]?.embedding;

    if (!vector) {
      console.log("❌ OpenAI error:", data);
      return jsonResponse({ error: "Embedding failed" }, 502);
    }

    vectors.push({
      chatbotId: file.chatbotId,
      companyId: file.companyId,
      fileId: id,
      fileName,
      index: i,
      text: chunks[i],
      embedding: vector,
    });
  }

  console.log("✅ VECTORS CREATED:", vectors.length);

  // -----------------------
  // 8) STORE VECTORS
  // -----------------------
  for (let i = 0; i < vectors.length; i++) {
    const vKey = `chatbot:vector:${file.chatbotId}:${id}:${i}`;
    await env.chatbotconfig.put(vKey, JSON.stringify(vectors[i]));
    console.log("💾 Stored:", vKey);
  }

  // -----------------------
  // 9) UPDATE FILE STATUS
  // -----------------------
  file.status = "indexed";
  file.updatedAt = Date.now();
  file.vectorCount = vectors.length;

  await env.chatbotconfig.put(key, JSON.stringify(file));

  console.log("✅ PROCESS COMPLETED:", id);

  return jsonResponse({
    success: true,
    indexed: true,
    vectors: vectors.length,
  });
}

function chunkText(text: string, size = 500) {
  const out: string[] = [];
  let i = 0;
  while (i < text.length) {
    out.push(text.slice(i, i + size));
    i += size;
  }
  return out;
}
