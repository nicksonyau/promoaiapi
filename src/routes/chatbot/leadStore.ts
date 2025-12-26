import { Env } from "../../index";

export async function upsertLead(
  env: Env,
  data: {
    phone?: string;
    email?: string;
    name?: string;
    sessionId: string;
    companyId: string;
    chatbotId?: string;
    source?: string;
    lastMessage?: string;
  }
) {
  if (!data.sessionId || !data.companyId) return null;

  // -----------------------------------
  // FIND EXISTING LEAD BY PHONE OR SESSION
  // -----------------------------------
  let existingLead = null;
  let existingKey: string | null = null;

  if (data.phone) {
    const keys = await env.LEADS_KV.list({ prefix: `lead:${data.companyId}:` });

    for (const key of keys.keys) {
      const record: any = await env.LEADS_KV.get(key.name, { type: "json" });
      if (record?.phone === data.phone) {
        existingLead = record;
        existingKey = key.name;
        break;
      }
    }
  }

  // -----------------------------------
  // CREATE OR UPDATE
  // -----------------------------------
  const now = Date.now();
  const id = existingLead?.id || crypto.randomUUID();

  const record = {
    id,
    companyId: data.companyId,
    chatbotId: data.chatbotId || existingLead?.chatbotId || null,
    sessionId: data.sessionId,

    phone: data.phone || existingLead?.phone || null,
    email: data.email || existingLead?.email || null,
    name: data.name || existingLead?.name || "Unknown",

    source: data.source || existingLead?.source || "chatbot",
    stage: existingLead?.stage || "new",
    status: existingLead?.status || "open",

    lastMessage: data.lastMessage || existingLead?.lastMessage || "",

    createdAt: existingLead?.createdAt || now,
    updatedAt: now
  };

  // -----------------------------------
  // SAVE USING UUID KEY (NOT PHONE)
  // -----------------------------------
  const key = `lead:${data.companyId}:${id}`;
  await env.LEADS_KV.put(key, JSON.stringify(record));

  // -----------------------------------
  // CLEAN OLD RECORD IF PHONE-BASED KEY EXISTS
  // -----------------------------------
  if (existingKey && existingKey !== key) {
    await env.LEADS_KV.delete(existingKey);
  }

  return record;
}
