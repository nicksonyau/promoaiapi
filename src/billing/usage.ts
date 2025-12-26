function monthKey() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export async function getUsage(env: any, companyId: string) {
  const key = `usage:${companyId}:${monthKey()}`;
  let usage = await env.KV.get(key, "json");

  if (!usage) {
    usage = {
      messagesUsed: 0,
      campaignsUsed: 0,
      updatedAt: new Date().toISOString(),
    };
    await env.KV.put(key, JSON.stringify(usage));
  }

  return usage;
}

export async function incrementUsage(
  env: any,
  companyId: string,
  field: "messagesUsed" | "campaignsUsed",
  value = 1
) {
  const usage = await getUsage(env, companyId);
  usage[field] += value;
  usage.updatedAt = new Date().toISOString();

  const key = `usage:${companyId}:${monthKey()}`;
  await env.KV.put(key, JSON.stringify(usage));
}
