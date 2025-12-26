import type { Subscription } from "./types";

export async function getOrCreateSubscription(
  env: any,
  companyId: string
): Promise<Subscription> {
  const key = `subscription:${companyId}`;
  let sub = await env.KV.get(key, "json");

  if (!sub) {
    sub = {
      plan: "free",
      interval: "month",
      status: "active",
      source: "auto",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await env.KV.put(key, JSON.stringify(sub));
  }

  return sub;
}

export async function saveSubscription(
  env: any,
  companyId: string,
  sub: Subscription
) {
  sub.updatedAt = new Date().toISOString();
  await env.KV.put(`subscription:${companyId}`, JSON.stringify(sub));
}
