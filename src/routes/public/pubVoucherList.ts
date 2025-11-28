// src/routes/public/voucherList.ts
import { jsonResponse } from "../../_lib/utils";

export async function pubVoucherList(req, env) {
  const url = new URL(req.url);
  const companyId = url.searchParams.get("companyId");

  if (!companyId)
    return jsonResponse({ success: false, error: "companyId required" }, 400);

  const idxKey = `voucher:index:company:${companyId}`;
  const ids = (await env.KV.get(idxKey, { type: "json" })) || [];

  const vouchers = [];
  for (const id of ids) {
    const raw = await env.KV.get(`voucher:${id}`, { type: "json" });
    if (raw) vouchers.push(raw);
  }

  return jsonResponse({ success: true, vouchers });
}
