// src/routes/voucher/voucherCreate.ts
import { jsonResponse } from "../../_lib/utils";
import { Voucher, computeVoucherStatus } from "../../_lib/voucherUtils";
import { auth } from "../../_lib/auth";

export async function voucherCreateHandler(req: Request, env: any): Promise<Response> {
  try {
    if (req.method !== "POST") {
      return jsonResponse({ success: false, error: "Method not allowed" }, 405);
    }

    // 🔒 AUTHENTICATION
    const session = await auth(env, req);
    if (!session || !session.companyId) {
      return jsonResponse({ success: false, error: "Unauthorized" }, 401);
    }

    const companyId = session.companyId;
    const body = await req.json().catch(() => null);
    if (!body) {
      return jsonResponse({ success: false, error: "Invalid JSON" }, 400);
    }

    // 🔍 VALIDATION
    const validation = validateVoucherInput(body);
    if (!validation.valid) {
      return jsonResponse({ success: false, error: validation.error }, 400);
    }

    const promoId = crypto.randomUUID();

    const voucher: Voucher = {
      promoId,
      companyId,
      ...validation.cleanedData,
      claimed: 0,
      redeemed: 0,
      status: "upcoming", // Will be computed later
      createdAt: new Date().toISOString(),
    };

    // Compute initial status
    voucher.status = computeVoucherStatus(voucher);

    // 📦 SAVE TO KV
    await env.KV.put(`voucher:${promoId}`, JSON.stringify(voucher));

    // 🗂️ UPDATE COMPANY INDEX
    const idxKey = `voucher:index:company:${companyId}`;
    const list: string[] = (await env.KV.get(idxKey, { type: "json" })) || [];
    list.push(promoId);
    await env.KV.put(idxKey, JSON.stringify(list));

    return jsonResponse({ success: true, promoId, voucher }, 201);
  } catch (err: any) {
    console.error("voucherCreate error:", err);
    return jsonResponse(
      { success: false, error: "Failed to create voucher", detail: String(err) },
      500
    );
  }
}

function validateVoucherInput(body: any) {
  if (!body.title?.trim()) return { valid: false, error: "Title is required" };
  if (!body.discountType || !['percentage', 'fixed'].includes(body.discountType)) {
    return { valid: false, error: "Invalid discount type (percentage or fixed)" };
  }
  if (body.discountType === 'percentage' && (body.discountValue < 1 || body.discountValue > 100)) {
    return { valid: false, error: "Percentage discount must be 1-100" };
  }
  if (body.discountType === 'fixed' && body.discountValue <= 0) {
    return { valid: false, error: "Fixed discount must be greater than 0" };
  }
  if (!body.totalQuantity || body.totalQuantity <= 0) {
    return { valid: false, error: "Total quantity is required and must be positive" };
  }
  if (!body.validFrom || !body.validUntil) {
    return { valid: false, error: "Valid from and until dates are required" };
  }
  if (new Date(body.validFrom) > new Date(body.validUntil)) {
    return { valid: false, error: "Valid from date must be before valid until date" };
  }

  return {
    valid: true,
    cleanedData: {
      title: body.title.trim(),
      description: body.description || "",
      discountType: body.discountType,
      discountValue: Number(body.discountValue),
      minSpend: Number(body.minSpend) || 0,
      maxDiscount: Number(body.maxDiscount) || 0,
      totalQuantity: Number(body.totalQuantity),
      perUserLimit: Number(body.perUserLimit) || 1,
      validFrom: body.validFrom,
      validUntil: body.validUntil,
      image: body.image || null,
    }
  };
}