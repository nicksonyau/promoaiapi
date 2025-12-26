import { Env } from "../../index";
import { routeIntent } from "./intentRouter";
import { loadCampaigns } from "./loadCampaigns";
import { loadVouchers } from "./loadVouchers";
import { embed } from "./embed";

// ✅ LEAD MODULES
import { extractPhone, extractEmail, extractName } from "./leadIdentity";
import { upsertLead } from "./leadStore";

// ----------------------------------------------------
// COSINE SIMILARITY
// ----------------------------------------------------
function cosineSim(a: number[], b: number[]) {
  let sum = 0,
    na = 0,
    nb = 0;
  for (let i = 0; i < a.length; i++) {
    sum += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return sum / (Math.sqrt(na) * Math.sqrt(nb));
}

// ----------------------------------------------------
// SESSION INDEXING (FOR HISTORY LIST)
// ----------------------------------------------------
async function indexSession(env: Env, chatbotId: string, sessionId: string) {
  const indexKey = `chat:index:${chatbotId}`;
 
  const list =
    (await env.CHAT_HISTORY_KV.get(indexKey, { type: "json" })) || [];

  const exists = list.find((x: any) => x.sessionId === sessionId);

  if (!exists) {
    list.push({ sessionId, ts: Date.now() });
    await env.CHAT_HISTORY_KV.put(indexKey, JSON.stringify(list.slice(-500)));
  }
}

// ----------------------------------------------------
// LOAD WEBSITE SOURCES
// ----------------------------------------------------
async function loadIndexedSources(env: Env, chatbotId: string) {
  const ids =
    (await env.chatbotconfig.get(`chatbot:sources:${chatbotId}`, {
      type: "json",
    })) || [];

  const chunks: any[] = [];

  for (const id of ids) {
    const source = await env.chatbotconfig.get(`chatbot:source:${id}`, {
      type: "json",
    });
    if (!source || source.status !== "indexed") continue;

    const content = await env.chatbotconfig.get(
      `chatbot:source:content:${id}`,
      { type: "json" }
    );
    const vectors = await env.chatbotconfig.get(`chatbot:vectors:${id}`, {
      type: "json",
    });

    if (!content?.chunks || !vectors) continue;

    content.chunks.forEach((text: string, i: number) => {
      chunks.push({ text, vec: vectors[i], url: content.url });
    });
  }

  return chunks;
}

// ----------------------------------------------------
// LOAD FILE SOURCES
// ----------------------------------------------------
async function loadIndexedFiles(env: Env, chatbotId: string) {
  const keys = await env.chatbotconfig.list({
    prefix: `chatbot:vector:${chatbotId}:`,
  });

  const chunks: any[] = [];

  for (const k of keys.keys) {
    const rec: any = await env.chatbotconfig.get(k.name, { type: "json" });
    if (!rec?.embedding || !rec?.text) continue;

    chunks.push({
      text: rec.text,
      vec: rec.embedding,
      url: rec.fileName || "PDF",
    });
  }

  return chunks;
}

// ----------------------------------------------------
// LOAD SITECRAWLER SOURCES
// ----------------------------------------------------
async function loadSiteCrawlerSources(env: Env, chatbotId: string) {
  const siteIds =
    (await env.chatbotconfig.get(`chatbot:sitecrawler:list:${chatbotId}`, {
      type: "json",
    })) || [];

  const chunks: any[] = [];

  for (const id of siteIds) {
    const metaRaw = await env.chatbotconfig.get(
      `chatbot:sitecrawler:site:${id}`
    );
    if (!metaRaw) continue;

    const meta = JSON.parse(metaRaw);
    if (meta.status !== "indexed") continue;

    const content = await env.chatbotconfig.get(
      `chatbot:sitecrawler:content:${id}`,
      { type: "json" }
    );
    if (!content?.pages) continue;

    for (const page of content.pages) {
      const body = page.text.slice(0, 3000);
      const vec = await embed(env, body);
      chunks.push({ text: body, vec, url: page.url });
    }
  }

  return chunks;
}

// ----------------------------------------------------
// VECTOR SEARCH
// ----------------------------------------------------
async function searchVectors(env: Env, question: string, chunks: any[]) {
  const qVec = await embed(env, question);

  return chunks
    .map((c) => ({
      ...c,
      score: cosineSim(qVec, c.vec) + (c.url === "PDF" ? 0.05 : 0),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .filter((x) => x.score > 0.5);
}

// ----------------------------------------------------
// ANSWER FROM KNOWLEDGE
// ----------------------------------------------------
async function answerFromKnowledge(env: Env, question: string, matches: any[]) {
  const material = matches
    .map((m) => `SOURCE: ${m.url}\n${m.text}`)
    .join("\n\n---\n\n");

  const prompt = `
Answer using ONLY the knowledge below.
If answer not found reply: NOT_FOUND.

--- KNOWLEDGE ---
${material}
--- END ---

QUESTION:
${question}
`.trim();

  const result = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", { prompt });
  return result.response.trim();
}

// ----------------------------------------------------
// CHAT HANDLER ✅ FIXED ORDER + HISTORY INDEX
// ----------------------------------------------------
export const chatHandler = async (req: Request, env: Env) => {
  try {
    const { chatbotId, sessionId, message, companyId } = await req.json();

    console.log("🟢 CHAT REQUEST");
    console.log("chatbotId:", chatbotId);
    console.log("sessionId:", sessionId);
    console.log("companyId:", companyId);
    console.log("message:", message);

    if (!chatbotId || !message) {
      return Response.json(
        { error: "chatbotId and message required" },
        { status: 400 }
      );
    }

    // -------------------------
    // LOAD BOT CONFIG
    // -------------------------
    const raw = await env.chatbotconfig.get(`config:${chatbotId}`);
    if (!raw)
      return Response.json({ error: "Chatbot not found" }, { status: 404 });

    const config = JSON.parse(raw);

    // -------------------------
    // CHAT HISTORY
    // -------------------------
    const historyKey = `chat:${chatbotId}:${sessionId}`;
     console.log("📜 ============HISTORY historyKey", historyKey);
    const history = JSON.parse(
      (await env.CHAT_HISTORY_KV.get(historyKey)) || "[]"
    );
    console.log("📜 ============HISTORY LOADED", history);


    // -------------------------
    // ✅ LEAD AUTO EXTRACTION
    // -------------------------
    const phone = extractPhone(message);
    const email = extractEmail(message);
    const name = extractName(message);

  console.log("✅ LEAD PARSE:", { phone, email, name });
if (phone || email) {
  await upsertLead(env, {
    phone,
    email,
    name,
    sessionId,
    companyId,
    chatbotId,
    source: "chatbot",
    lastMessage: message,
  });
} else {
  console.log("⛔ Lead skipped (no phone/email)");
}

    // -------------------------
    // ✅ INTENT CLASSIFICATION
    // -------------------------s
    const menuLines = (config.quickMenu || "")
      .split("\n")
      .map((x: string) => x.trim())
      .filter(Boolean);

    const llm = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
      prompt: `
Select intent:

${menuLines.map((x) => "- " + x).join("\n")}

Return JSON:
{ "intent": string, "confidence": "high"|"medium"|"low" }

Message: "${message}"
`.trim(),
    });

    let parsed;
    try {
      parsed = JSON.parse(llm.response.trim());
    } catch {
      parsed = { intent: "unknown", confidence: "low" };
    }

    const category = routeIntent(parsed.intent, message);

    console.log("🧠 INTENT LLM RESULT:", parsed.intent);
    console.log("📨 USER MESSAGE:", message);
    console.log("✅ ROUTED CATEGORY:", category);

    // -------------------------
    // ✅ LEAD FORM FIRST (BLOCK RAG)
    // -------------------------
    if (
      ["lead_form", "signup", "login", "question", "booking"].includes(
        category
      ) &&
      !phone
    ) {
      console.log("📋 PROMPTING LEAD FORM");

      return Response.json({
        success: true,
        requireLead: true,
        form: {
          title: "Just a quick detail 😊",
          fields: [
            { key: "name", label: "Your Name", required: true },
            { key: "phone", label: "Phone Number", required: true },
            { key: "email", label: "Email (optional)", required: false },
          ],
          submitText: "Continue",
        },
      });
    }

    // -------------------------
    // ✅ RAG PIPELINE (AFTER FORM)
    // -------------------------
    const knowledge = [
      ...(await loadIndexedSources(env, chatbotId)),
      ...(await loadIndexedFiles(env, chatbotId)),
      ...(await loadSiteCrawlerSources(env, chatbotId)),
    ];

    if (knowledge.length) {
      const matches = await searchVectors(env, message, knowledge);

      if (matches.length) {
        const answer = await answerFromKnowledge(env, message, matches);
        if (!answer.includes("NOT_FOUND")) {
          history.push({ role: "user", content: message });
          history.push({ role: "assistant", content: answer });

          await env.CHAT_HISTORY_KV.put(
            historyKey,
            JSON.stringify(history.slice(-20))
          );
          console.log("💾 HISTORY SAVED", history.slice(-20));

          // ✅ Index session for history list (RAG path)
          await indexSession(env, chatbotId, sessionId);

          return Response.json({
            success: true,
            source: "rag",
            reply: answer,
          });
        }
      }
    }

    // -------------------------
    // ✅ VOUCHER STRICT
    // -------------------------
    if (category === "voucher" && !phone) {
      return Response.json({
        success: true,
        requireLead: true,
        form: {
          title: "Get your voucher 🎁",
          fields: [
            { key: "phone", label: "Phone Number", required: true },
            { key: "name", label: "Name", required: false },
            { key: "email", label: "Email", required: false },
          ],
          submitText: "Unlock Voucher",
        },
      });
    }

    // -------------------------
    // ✅ BUSINESS LOGIC
    // -------------------------
    let reply = config.fallbackMessage || "Can you clarify?";

    switch (category) {
      case "promotions":
        reply = await loadCampaigns(env, companyId || config.companyId);
        break;
      case "voucher":
        reply = await loadVouchers(env, companyId || config.companyId);
        break;
      case "info":
        reply = `${config.businessName}\n${config.brandTagline}\n${config.businessDescription}`;
        break;
      case "location":
        reply = config.location;
        break;
      case "opening_hours":
        reply = config.operatingHours;
        break;
      case "contact":
        reply = config.socialLinks;
        break;
    }

    // -------------------------
    // SAVE CHAT
    // -------------------------
    history.push({ role: "user", content: message });
    history.push({ role: "assistant", content: reply });

    await env.CHAT_HISTORY_KV.put(
      historyKey,
      JSON.stringify(history.slice(-20))
    );

    // ✅ Index session for history list (intent path)
    await indexSession(env, chatbotId, sessionId);

    return Response.json({
      success: true,
      category,
      reply,
      source: "intent",
    });
  } catch (err: any) {
    console.error("❌ CHAT ERROR", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
};
