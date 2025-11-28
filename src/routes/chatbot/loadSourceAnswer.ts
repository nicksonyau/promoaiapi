import { embed } from "./embed";
import { cosineSimilarity } from "./vectorSearch";

export async function loadSourceAnswer(env: Env, chatbotId: string, userMessage: string) {
  const indexKey = `chatbot:sources:${chatbotId}`;
  const ids = (await env.chatbotconfig.get(indexKey, { type: "json" })) || [];

  if (!ids.length) return null;

  let chunks: string[] = [];
  let vectors: number[][] = [];

  for (const id of ids) {
    const content = await env.chatbotconfig.get(`chatbot:source:content:${id}`, { type: "json" });
    const vecs = await env.chatbotconfig.get(`chatbot:vectors:${id}`, { type: "json" });

    if (content?.chunks && vecs?.length) {
      chunks.push(...content.chunks);
      vectors.push(...vecs);
    }
  }

  if (!vectors.length) return null;

  // ✅ Embed query
  const queryVec = await embed(env, userMessage);

  // ✅ Rank
  const ranked = vectors.map((v, i) => ({
    index: i,
    score: cosineSimilarity(queryVec, v)
  }))
  .sort((a, b) => b.score - a.score)
  .slice(0, 5);

  // ✅ Return best chunks
  return ranked.map(r => chunks[r.index]).join("\n\n---\n\n");
}
