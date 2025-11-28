export async function listSourcesCore(env: any, chatbotId: string) {
  const result = await env.chatbotconfig.list({ prefix: "chatbot:source:" });
  const list = [];

  for (const key of result.keys) {
    const raw = await env.chatbotconfig.get(key.name);
    if (!raw) continue;

    const obj = JSON.parse(raw);
    if (obj.chatbotId !== chatbotId) continue;

    list.push(obj);
  }

  return list;
}
