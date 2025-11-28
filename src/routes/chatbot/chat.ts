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
// LOAD INDEXED SOURCES (CHEERIO OUTPUT)
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

  console.log("📚 INDEXED WEBSITE CHUNKS:", chunks.length);

  return chunks;
}

// ----------------------------------------------------
// VECTOR SEARCH
// ----------------------------------------------------
async function searchVectors(
  env: Env,
  question: string,
  chunks: any[]
) {
  const qVec = await embed(env, question);

  const ranked = chunks
    .map(chunk => ({
      ...chunk,
      score: cosineSim(qVec, chunk.vec)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  console.log("🔍 Top matches:");
  ranked.forEach((r, i) =>
    console.log(`#${i + 1} [${r.score.toFixed(4)}]`, r.text.slice(0, 90))
  );

  return ranked.filter(x => x.score > 0.73);
}

// ----------------------------------------------------
// ANSWER VIA WEBSITE KNOWLEDGE
// ----------------------------------------------------
async function answerFromWebsite(env: Env, question: string, matches: any[]) {
  const material = matches
    .map(m => `SOURCE: ${m.url}\n${m.text}`)
    .join("\n\n---\n\n");

  const prompt = `
Answer the QUESTION using ONLY the WEBSITE DATA below.
If not found, reply: NOT_FOUND.

--- WEBSITE DATA ---
${material}
--- END ---

QUESTION:
${question}

Rules:
- No hallucination
- Summarise cleanly
- Quote facts if possible
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
    // ✅ RAG FIRST: VECTOR SEARCH
    // ------------------------------------------------
    const chunks = await loadIndexedSources(env, chatbotId);

    if (chunks.length > 0) {
      const matches = await searchVectors(env, message, chunks);

      if (matches.length > 0) {
        console.log("✅ WEBSITE MATCH FOUND");

        const answer = await answerFromWebsite(env, message, matches);

        if (!answer.includes("NOT_FOUND")) {
          const newHistory = [...history,
            { role: "user", content: message },
            { role: "assistant", content: answer }
          ].slice(-20);

          await env.CHAT_HISTORY_KV.put(historyKey, JSON.stringify(newHistory));

          return Response.json({
            success: true,
            source: "website",
            reply: answer,
            matches: matches.length
          });
        }

        console.log("⚠️ Website matched but did not answer");
      }
    }

    // ------------------------------------------------
    // FALLBACK: INTENT AI
    // ------------------------------------------------
    console.log("➡️ Fallback to intent system");

    const menuLines = (config.quickMenu || "").split("\n").map((x: string) => x.trim()).filter(Boolean);

    const prompt = `
Select intent from:
${menuLines.map(m => "- " + m).join("\n")}

Return JSON ONLY:
{
  "intent": string,
  "confidence": "high" | "medium" | "low"
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
