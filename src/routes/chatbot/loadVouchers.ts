// src/routes/chatbot/loadVouchers.ts

import { Env } from "../../index";

export async function loadVouchers(env: Env, companyId: string) {
  console.log("📌 loadVouchers (DIRECT KV) companyId:", companyId);

  // 1) Index → list of voucher IDs
  const idxKey = `voucher:index:company:${companyId}`;
  const voucherIds =
    (await env.KV.get(idxKey, { type: "json" })) || [];

  console.log("📌 Voucher IDs:", voucherIds);

  if (!voucherIds || voucherIds.length === 0) {
    return "No vouchers available now.";
  }

  // 2) Load each voucher from KV
  const vouchers: any[] = [];

  for (const vid of voucherIds) {
    const raw = await env.KV.get(`voucher:${vid}`, { type: "json" });
    if (raw) vouchers.push(raw);
  }

  console.log("📦 Loaded vouchers:", vouchers);

  if (vouchers.length === 0) {
    return "No vouchers available now.";
  }

  // 3) Format chatbot reply
  return vouchers
    .map(
      (v: any) =>
        `🎫 ${v.title}\n  ${v.description || ""}\n  Valid: ${v.validFrom} → ${v.validUntil}`
    )
    .join("\n\n");
}
