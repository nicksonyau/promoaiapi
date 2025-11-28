import { Env } from "../../index";
import { jsonResponse } from "../../_lib/utils";
import { auth } from "../../_lib/auth";
import * as cheerio from "cheerio";

// ------------------------------------------------------------
// CLOUDFLARE AI EMBEDDING
// ------------------------------------------------------------
async function embed(env: Env, text: string): Promise<number[]> {
  const result = await env.AI.run("@cf/baai/bge-base-en-v1.5", {
    text: [text],
  });
  return result.data[0]; // embedding vector
}

// ------------------------------------------------------------
// CHEERIO CLEANER (REAL DOM PARSING)
// ------------------------------------------------------------
function cleanWithCheerio(html: string) {
  const $ = cheerio.load(html);

  // Remove junk tags
  $("script,style,noscript,iframe,svg,canvas,object,embed").remove();
  $("meta,link,header,footer,nav,aside").remove();

  // Remove common popups / cookies / ads by patterns
  $(
    '[id*="cookie"],[class*="cookie"],[id*="consent"],[class*="consent"],' +
      '[id*="popup"],[class*="popup"],[id*="ads"],[class*="ads"],[class*="banner"]'
  ).remove();

  // Extract headings
  const headings: string[] = [];
  $("h1,h2,h3,h4,h5,h6").each((_, el) => {
    const t = $(el).text().trim();
    if (t) headings.push(t);
  });

  // Extract body text
  const text = $("body")
    .text()
    .replace(/\s+/g, " ")
    .replace(/\u00A0/g, " ")
    .trim();

  return { text, headings };
}

// ------------------------------------------------------------
// TEXT CHUNKING
// ------------------------------------------------------------
function chunk(text: string, size = 900) {
  const out: string[] = [];
  for (let i = 0; i < text.length; i += size) out.push(text.slice(i, i + size));
  return out;
}

// ------------------------------------------------------------
// SOURCE PROCESS PIPELINE
// ------------------------------------------------------------
export async function chatbotSourceProcessHandler(
  req: Request,
  env: Env,
  sourceId: string
) {
  console.log("========== CHEERIO + CF AI PROCESS START ==========");

  try {
    // ------------------------
    // AUTH
    // ------------------------
    const session = await auth(env, req);
    if (!session?.companyId)
      return jsonResponse({ success: false, error: "Unauthorized" }, 401);

    if (!sourceId)
      return jsonResponse({ success: false, error: "Missing sourceId" }, 400);

    // ------------------------
    // LOAD SOURCE
    // ------------------------
    const sourceKey = `chatbot:source:${sourceId}`;
    const source = await env.chatbotconfig.get(sourceKey, { type: "json" });
    if (!source)
      return jsonResponse({ success: false, error: "Source not found" }, 404);

    console.log("🌐 URL:", source.url);

    // ------------------------
    // FETCH WEBSITE
    // ------------------------
    const res = await fetch(source.url, {
      headers: { "User-Agent": "PromoHubAI-Bot/1.0", Accept: "text/html" },
    });
    if (!res.ok)
      return jsonResponse(
        { success: false, error: `Fetch failed (${res.status})` },
        502
      );

    const html = await res.text();
    console.log("✅ HTML size:", Math.round(html.length / 1024), "KB");

    // ------------------------
    // CLEAN WITH CHEERIO
    // ------------------------
    console.log("🧹 Cleaning via Cheerio...");
    const { text, headings } = cleanWithCheerio(html);

    if (!text || text.length < 50)
      return jsonResponse(
        { success: false, error: "No readable content" },
        400
      );

    console.log("🧾 Cleaned length:", text.length);
    console.log("📑 Headings:", headings.length);

    // ------------------------
    // CHUNK
    // ------------------------
    console.log("✂️ Chunking...");
    const chunks = chunk(text);
    console.log("✅ Chunk count:", chunks.length);

    // ------------------------
    // EMBEDDINGS (CLOUDFLARE AI)
    // ------------------------
    if (!env.AI)
      return jsonResponse({ error: "Cloudflare AI not configured" }, 500);

    console.log("🧠 Embedding with Cloudflare AI...");
    const stored: string[] = [];

    for (let i = 0; i < chunks.length; i++) {
      console.log(`🧠 Embedding ${i + 1}/${chunks.length}`);
      const vector = await embed(env, chunks[i]);

      const vKey = `chatbot:vector:${source.chatbotId}:${sourceId}:${i}`;
      await env.chatbotconfig.put(
        vKey,
        JSON.stringify({
          chatbotId: source.chatbotId,
          sourceId,
          url: source.url,
          index: i,
          text: chunks[i],
          embedding: vector,
        })
      );

      stored.push(vKey);
    }

    console.log("✅ Vectors stored:", stored.length);

    // ------------------------
    // STORE CLEANED CONTENT
    // ------------------------
    const contentKey = `chatbot:source:content:${sourceId}`;
    await env.chatbotconfig.put(
      contentKey,
      JSON.stringify({
        sourceId,
        chatbotId: source.chatbotId,
        url: source.url,
        headings,
        chunks,
        createdAt: Date.now(),
      })
    );

    // ------------------------
    // MARK SOURCE INDEXED
    // ------------------------
    source.status = "indexed";
    source.updatedAt = Date.now();
    source.vectorCount = stored.length;
    source.chunkCount = chunks.length;
    await env.chatbotconfig.put(sourceKey, JSON.stringify(source));

    console.log("========== CHEERIO + CF AI COMPLETE ==========");

    return jsonResponse({
      success: true,
      url: source.url,
      chunks: chunks.length,
      vectors: stored.length,
      headings: headings.length,
      status: "indexed",
    });
  } catch (err: any) {
    console.error("🔥 PROCESS ERROR:", err);
    return jsonResponse(
      { success: false, error: err.message || "Process failed" },
      500
    );
  }
}
