import { Env } from "../../index";
import { routeIntent } from "./intentRouter";
import { loadCampaigns } from "./loadCampaigns";
import { loadVouchers } from "./loadVouchers";
import { embed } from "./embed";

// ----------------------------------------------------
// COSINE SIMILARITY
// ----------------------------------------------------
function cosineSim(a: number[], b: number[]) {
  let sum = 0, na = 0, nb = 0;

  for (let i = 0; i < a.length; i++) {
    sum += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }

  return sum / (Math.sqrt(na) * Math.sqrt(nb));
}

// ----------------------------------------------------
// LOAD WEBSITE RAG
// ----------------------------------------------------
async function loadIndexedSources(env: Env, chatbotId: string) {
  const indexKey = `chatbot:sources:${chatbotId}`;
  const ids = (await env.chatbotconfig.get(indexKey, { type: "json" })) || [];

  const chunks: { text: string; url: string; vec: number[] }[] = [];

  for (const id of ids) {
    const source = await env.chatbotconfig.get(`chatbot:source:${id}`, { type: "json" });
    if (!source || source.status !== "indexed") continue;

    const content = await env.chatbotconfig.get(`chatbot:source:content:${id}`, { type: "json" });
    const vectors = await env.chatbotconfig.get(`chatbot:vectors:${id}`, { type: "json" });

    if (!content?.chunks || !vectors) continue;

    content.chunks.forEach((text: string, i: number) => {
      chunks.push({ text, url: content.url, vec: vectors[i] });
    });
  }

  console.log("🌐 WEBSITE CHUNKS:", chunks.length);
  return chunks;
}

// ----------------------------------------------------
// ✅ LOAD PDF / FILE VECTORS
// ----------------------------------------------------
async function loadIndexedFiles(env: Env, chatbotId: string) {
  const prefix = `chatbot:vector:${chatbotId}:`;
  const keys = await env.chatbotconfig.list({ prefix });

  const chunks: { text: string; url: string; vec: number[] }[] = [];

  for (const k of keys.keys) {
    const rec: any = await env.chatbotconfig.get(k.name, { type: "json" });
    if (!rec || !rec.embedding || !rec.text) continue;

    chunks.push({
      text: rec.text,
      vec: rec.embedding,
      url: rec.fileName || "PDF"
    });
  }

  console.log("📄 PDF CHUNKS:", chunks.length);
  return chunks;
}

// ----------------------------------------------------
// VECTOR SEARCH
// ----------------------------------------------------
async function searchVectors(env: Env, question: string, chunks: any[]) {
  const qVec = await embed(env, question);

  const ranked = chunks
    .map(chunk => {
      const boost = chunk.url === "PDF" ? 0.05 : 0; // ✅ Prioritize PDFs
      return {
        ...chunk,
        score: cosineSim(qVec, chunk.vec) + boost
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  console.log("🔍 Top matches:");
  ranked.forEach((r, i) =>
    console.log(`#${i + 1} [${r.score.toFixed(4)}]`, r.text.slice(0, 120))
  );

  // ✅ LOWER threshold so matches aren't discarded
  const THRESHOLD = 0.60;

  const accepted = ranked.filter(x => x.score > THRESHOLD);

  accepted.forEach(x =>
    console.log("✅ ACCEPTED:", x.score.toFixed(4), x.text.slice(0, 80))
  );

  ranked
    .filter(x => x.score <= THRESHOLD)
    .forEach(x =>
      console.log("❌ REJECTED:", x.score.toFixed(4), x.text.slice(0, 80))
    );

  return accepted;
}


// ----------------------------------------------------
// ANSWER FROM RAG
// ----------------------------------------------------
async function answerFromKnowledge(env: Env, question: string, matches: any[]) {
  const material = matches
    .map(m => `SOURCE: ${m.url}\n${m.text}`)
    .join("\n\n---\n\n");

  const prompt = `
Answer using ONLY the knowledge below.
If answer not found reply: NOT_FOUND.

--- KNOWLEDGE ---
${material}
--- END ---

QUESTION:
${question}

Rules:
- Do not hallucinate
- Quote facts if needed
- Be concise
`.trim();

  const result = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", { prompt });
  return result.response.trim();
}

// ----------------------------------------------------
// CHAT HANDLER
// ----------------------------------------------------
export const chatHandler = async (req: Request, env: Env) => {
  try {
    const { chatbotId, sessionId, message, companyId } = await req.json();

    console.log("\n============== CHAT REQUEST ==============");
    console.log("bot:", chatbotId);
    console.log("msg:", message);

    if (!chatbotId || !message) {
      return Response.json({ error: "chatbotId and message required" }, { status: 400 });
    }

    // LOAD CONFIG
    const raw = await env.chatbotconfig.get(`config:${chatbotId}`);
    if (!raw) return Response.json({ error: "Chatbot not found" }, { status: 404 });

    const config = JSON.parse(raw);

    // LOAD HISTORY
    const historyKey = `chat:${chatbotId}:${sessionId}`;
    const history = JSON.parse(await env.CHAT_HISTORY_KV.get(historyKey) || "[]");

    // ------------------------------------------------
    // ✅ HYBRID RAG
    // ------------------------------------------------
    const webChunks = await loadIndexedSources(env, chatbotId);
    const fileChunks = await loadIndexedFiles(env, chatbotId);

    const all = [...webChunks, ...fileChunks];

    console.log(`📚 TOTAL SEARCH CHUNKS: ${all.length}`);

    if (all.length > 0) {
      const matches = await searchVectors(env, message, all);

      if (matches.length > 0) {
        console.log("✅ KNOWLEDGE MATCH FOUND");

        const answer = await answerFromKnowledge(env, message, matches);

        if (!answer.includes("NOT_FOUND")) {
          const newHistory = [...history,
            { role: "user", content: message },
            { role: "assistant", content: answer }
          ].slice(-20);

          await env.CHAT_HISTORY_KV.put(historyKey, JSON.stringify(newHistory));

          return Response.json({
            success: true,
            source: "rag",
            reply: answer,
            matches: matches.length
          });
        }

        console.log("⚠️ RAG MATCH BUT NO ANSWER");
      }
    }

    // ------------------------------------------------
    // FALLBACK INTENT AI
    // ------------------------------------------------
    console.log("➡️ Fallback to intent system");

    const menuLines = (config.quickMenu || "")
      .split("\n")
      .map((x: string) => x.trim())
      .filter(Boolean);

    const prompt = `
Select intent:

${menuLines.map(m => "- " + m).join("\n")}

Return JSON:
{
  "intent": string,
  "confidence": "high"|"medium"|"low"
}

Message: "${message}"
`.trim();

    const result = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", { prompt });
    let parsed;

    try {
      parsed = JSON.parse(result.response.trim());
    } catch {
      parsed = { intent: "unknown", confidence: "low" };
    }

    const category = routeIntent(parsed.intent, message);
    let finalReply = config.fallbackMessage || "Can you clarify?";

    switch (category) {
      case "promotions":
        finalReply = await loadCampaigns(env, companyId || config.companyId);
        break;
      case "voucher":
        finalReply = await loadVouchers(env, companyId || config.companyId);
        break;
      case "info":
        finalReply = `${config.businessName}\n${config.brandTagline}\n${config.businessDescription}`;
        break;
      case "location":
        finalReply = config.location;
        break;
      case "opening_hours":
        finalReply = config.operatingHours;
        break;
      case "contact":
        finalReply = config.socialLinks;
        break;
      default:
        finalReply = config.fallbackMessage || "Can you clarify?";
    }

    const newHistory = [...history,
      { role: "user", content: message },
      { role: "assistant", content: finalReply }
    ].slice(-20);

    await env.CHAT_HISTORY_KV.put(historyKey, JSON.stringify(newHistory));

    return Response.json({
      success: true,
      source: "intent",
      reply: finalReply,
      category
    });

  } catch (err: any) {
    console.error("❌ CHAT ERROR", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
};
