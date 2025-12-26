import { Env } from "../../index";

export async function getBroadcast(env: Env, id: string) {
  const data = await env.KV.get(`broadcast:${id}`);
  return data ? JSON.parse(data) : null;
}

export async function saveBroadcast(env: Env, data: any) {
  await env.KV.put(`broadcast:${data.id}`, JSON.stringify(data));
}

export async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function checkUsage(env: Env, companyId: string, limit: number) {
  const key = `usage:${companyId}:${new Date().toISOString().slice(0, 7)}`;
  const usage = JSON.parse(await env.KV.get(key) || "{}");

  if ((usage.broadcastSent || 0) >= limit) {
    throw new Error("Broadcast limit exceeded");
  }

  usage.broadcastSent = (usage.broadcastSent || 0) + 1;
  await env.KV.put(key, JSON.stringify(usage));
}
