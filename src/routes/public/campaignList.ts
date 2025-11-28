// src/routes/public/campaignList.ts
import { jsonResponse } from "../../_lib/utils";

export async function publicCampaignList(req, env) {
  const url = new URL(req.url);
  const companyId = url.searchParams.get("companyId");

  if (!companyId)
    return jsonResponse({ success: false, error: "companyId required" }, 400);

  const key = `campaigns:${companyId}`;
  const list = await env.KV.get(key, { type: "json" });

  return jsonResponse({ success: true, campaigns: list || [] });
}
