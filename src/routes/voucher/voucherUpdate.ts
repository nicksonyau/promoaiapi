// src/routes/voucher/voucherUpdate.ts
import {
  Voucher,
  computeVoucherStatus,
  parseIntSafe,
  nowIso,
} from "../../_lib/voucherUtils";

function jsonResponse(obj: any, status = 200): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function voucherUpdateHandler(req: Request, env: any): Promise<Response> {
  try {
    if (req.method !== "PUT" && req.method !== "PATCH") {
      return jsonResponse({ success: false, error: "Method not allowed" }, 405);
    }

    // -----------------------------
    // ✔ Extract promoId from path — NOT query string
    // -----------------------------
    const promoId = req.url.split("/voucher/update/")[1]?.trim();
    if (!promoId) {
      return jsonResponse({ success: false, error: "promoId required" }, 400);
    }

    // -----------------------------
    // Parse body
    // -----------------------------
    const body = await req.json().catch(() => null);
    if (!body) {
      return jsonResponse({ success: false, error: "Invalid JSON" }, 400);
    }

    // -----------------------------
    // Load voucher
    // -----------------------------
    const raw = await env.KV.get(`voucher:${promoId}`, { type: "json" });
    if (!raw) {
      return jsonResponse({ success: false, error: "Voucher not found" }, 404);
    }

    const voucher = raw as Voucher;

    // -----------------------------
    // Update fields
    // -----------------------------
    if (body.title !== undefined) voucher.title = String(body.title);
    if (body.description !== undefined) voucher.description = String(body.description);

    if (body.discountType !== undefined)
      voucher.discountType = body.discountType;

    if (body.discountValue !== undefined)
      voucher.discountValue = parseIntSafe(body.discountValue, voucher.discountValue);

    if (body.minSpend !== undefined)
      voucher.minSpend = parseIntSafe(body.minSpend, voucher.minSpend);

    if (body.maxDiscount !== undefined)
      voucher.maxDiscount = parseIntSafe(body.maxDiscount, voucher.maxDiscount || 0);

    if (body.totalQuantity !== undefined) {
      const newTotal = Math.max(1, parseIntSafe(body.totalQuantity, voucher.totalQuantity));
      const diff = newTotal - voucher.totalQuantity;
      voucher.totalQuantity = newTotal;
      voucher.remainingQuantity = Math.max(0, voucher.remainingQuantity + diff);
    }

    if (body.perUserLimit !== undefined)
      voucher.perUserLimit = Math.max(1, parseIntSafe(body.perUserLimit, voucher.perUserLimit));

    if (body.validFrom !== undefined) voucher.validFrom = String(body.validFrom);
    if (body.validUntil !== undefined) voucher.validUntil = String(body.validUntil);

    if (body.status !== undefined) voucher.status = body.status;

    voucher.updatedAt = nowIso();

    // Recompute status
    voucher.status = computeVoucherStatus(voucher);

    // -----------------------------
    // Save
    // -----------------------------
    await env.KV.put(`voucher:${promoId}`, JSON.stringify(voucher));

    return jsonResponse({ success: true, voucher });
  } catch (err: any) {
    console.error("voucherUpdate error:", err);
    return jsonResponse(
      { success: false, error: "Failed to update voucher", message: String(err?.message || err) },
      500
    );
  }
}
