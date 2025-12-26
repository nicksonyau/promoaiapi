import type { Env } from "../../index";
import type { InboxConversation, InboxMessage } from "./types";

const MAX_CONVS = 200;
const MAX_MSGS = 500;

function kConv(companyId: string, convKey: string) {
  return `inbox:${companyId}:conv:${convKey}`;
}
function kMsgs(companyId: string, convKey: string) {
  return `inbox:${companyId}:conv:${convKey}:msgs`;
}
function kList(companyId: string) {
  return `inbox:${companyId}:list`;
}

export async function getConversation(
  env: Env,
  companyId: string,
  convKey: string
): Promise<InboxConversation | null> {
  return await env.KV.get(kConv(companyId, convKey), "json");
}

export async function putConversation(
  env: Env,
  conv: InboxConversation
): Promise<void> {
  await env.KV.put(kConv(conv.companyId, conv.convKey), JSON.stringify(conv));
}

export async function listConversations(
  env: Env,
  companyId: string
): Promise<InboxConversation[]> {
  const arr = (await env.KV.get(kList(companyId), "json")) as InboxConversation[] | null;
  const list = Array.isArray(arr) ? arr : [];
  // Always enforce ordering
  list.sort((a, b) => (b.lastAt || 0) - (a.lastAt || 0));
  return list;
}

export async function upsertConversationIndex(
  env: Env,
  conv: InboxConversation
): Promise<void> {
  const list = await listConversations(env, conv.companyId);
  const filtered = list.filter((c) => c.convKey !== conv.convKey);
  filtered.unshift(conv);
  await env.KV.put(kList(conv.companyId), JSON.stringify(filtered.slice(0, MAX_CONVS)));
}

export async function upsertConversation(
  env: Env,
  conv: InboxConversation
): Promise<void> {
  await putConversation(env, conv);
  await upsertConversationIndex(env, conv);
}

export async function appendMessage(
  env: Env,
  companyId: string,
  convKey: string,
  msg: InboxMessage
): Promise<void> {
  const key = kMsgs(companyId, convKey);
  const arr = (await env.KV.get(key, "json")) as InboxMessage[] | null;
  const msgs = Array.isArray(arr) ? arr : [];
  msgs.push(msg);
  // keep tail
  const tail = msgs.length > MAX_MSGS ? msgs.slice(msgs.length - MAX_MSGS) : msgs;
  await env.KV.put(key, JSON.stringify(tail));
}

export async function getMessages(
  env: Env,
  companyId: string,
  convKey: string
): Promise<InboxMessage[]> {
  const arr = (await env.KV.get(kMsgs(companyId, convKey), "json")) as InboxMessage[] | null;
  return Array.isArray(arr) ? arr : [];
}
