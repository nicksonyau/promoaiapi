// src/_lib/voucherUtils.ts

// ---------------------------
// Types
// ---------------------------
export type VoucherStatus = "draft" | "active" | "active_exhausted" | "expired" | "disabled";

export type VoucherDiscountType = "percentage" | "fixed" | "free-item";

export interface Voucher {
  promoId: string;
  storeId: string;

  title: string;
  description?: string;

  // Discount logic
  discountType: VoucherDiscountType; // "percentage" | "fixed" | "free-item"
  discountValue: number;             // percentage (0–100) or fixed amount in RM
  minSpend: number;                  // minimum spend in RM for voucher to apply
  maxDiscount?: number;              // max discount cap for percentage type

  // Limits
  totalQuantity: number;             // total allowed claims
  remainingQuantity: number;         // remaining claims
  perUserLimit: number;              // max claims per user (phone/userId)

  // Validity window
  validFrom: string;                 // ISO string
  validUntil: string;                // ISO string

  // Status
  status: VoucherStatus;

  // Optional media
  bannerImageKey?: string;           // R2 object key
  bannerImageUrl?: string;           // public URL (filled on list/detail)

  // Metadata
  createdAt: string;
  updatedAt: string;
}

export interface VoucherClaim {
  id: string;               // claim id (and code for user)
  promoId: string;
  storeId: string;
  userId?: string;
  phone?: string;

  createdAt: string;
  redeemedAt?: string;

  // For analytics / tracking
  source?: string;          // "chatbot" | "qr" | "manual"
  meta?: any;
}

// ---------------------------
// Helpers
// ---------------------------
export function generateCode(prefix = "VC", length = 8) {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // avoid ambiguous characters
  let s = "";
  for (let i = 0; i < length; i++)
    s += chars[Math.floor(Math.random() * chars.length)];
  return `${prefix}_${s}`;
}

export function nowIso() {
  return new Date().toISOString();
}

export function parseIntSafe(v: any, fallback = 0) {
  const n = parseInt(`${v}`, 10);
  return Number.isNaN(n) ? fallback : n;
}

export function computeVoucherStatus(v: Voucher, now = new Date()): VoucherStatus {
  const nowTs = now.getTime();
  const start = v.validFrom ? Date.parse(v.validFrom) : NaN;
  const end = v.validUntil ? Date.parse(v.validUntil) : NaN;

  if (v.status === "disabled") return "disabled";

  if (!Number.isNaN(end) && nowTs > end) return "expired";
  if (v.remainingQuantity <= 0) return "active_exhausted";

  if (!Number.isNaN(start) && nowTs < start) {
    // treat as draft/upcoming
    return v.status === "draft" ? "draft" : "draft";
  }

  return "active";
}
