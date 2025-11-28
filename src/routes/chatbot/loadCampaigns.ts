// src/routes/chatbot/loadCampaigns.ts

import { Env } from "../../index";

export async function loadCampaigns(env: Env, companyId: string) {
  console.log("📌 loadCampaigns (DIRECT KV) companyId:", companyId);

  // 1) Index → list of campaign IDs
  const idxKey = `campaign:index:company:${companyId}`;
  const campaignIds =
    (await env.KV.get(idxKey, { type: "json" })) || [];

  console.log("📌 Campaign IDs:", campaignIds);

  if (!campaignIds || campaignIds.length === 0) {
    return "No promotions available now.";
  }

  // 2) Load each campaign from KV
  const campaigns: any[] = [];

  for (const cid of campaignIds) {
    const raw = await env.KV.get(`campaign:${cid}`, { type: "json" });
    if (raw) campaigns.push(raw);
  }

  console.log("📦 Loaded campaigns:", campaigns);

  if (campaigns.length === 0) {
    return "No promotions available now.";
  }

  // 3) Format chatbot reply
  return campaigns
    .map(
      (c: any) =>
        `🔥 ${c.title}\n  ${c.description || ""}\n  Valid: ${c.startDate} → ${c.endDate}`
    )
    .join("\n\n");
}
