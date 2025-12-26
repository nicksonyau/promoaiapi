import { Env } from "../../../index";
import { jsonResponse } from "../../_lib/utils";

// Accept either:
// Authorization: Bearer <secret>
// x-api-key: <secret>
function extractApiKey(req: Request): string | null {
  const auth = req.headers.get("Authorization") || req.headers.get("authorization");
  if (auth && auth.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();

  const x = req.headers.get("x-api-key") || req.headers.get("X-API-Key");
  if (x && x.trim()) return x.trim();

  return null;
}

function base64Url(bytes: Uint8Array) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function sha256Hex(input: string): Promise<string> {
  const enc = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  const bytes = new Uint8Array(buf);
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export type ApiKeySession = {
  companyId: string;
  keyId: string;
};

type LookupDoc = { companyId: string; keyId: string };
type ApiKeyRecord = {
  keyId: string;
  companyId: string;
  name: string;
  prefix: string;       // visible prefix like "phk_..."
  secretHash: string;   // sha256(secret)
  createdAt: string;
  revokedAt?: string | null;
  lastUsedAt?: string | null;
};

// small write throttle so you don’t KV.put on every request
async function maybeTouchLastUsed(env: Env, rec: ApiKeyRecord) {
  const touchKey = `apikey_touch:${rec.companyId}:${rec.keyId}`;
  const lastTouch = await env.KV.get(touchKey);
  const now = Date.now();

  if (!lastTouch) {
    await env.KV.put(touchKey, String(now), { expirationTtl: 300 }); // 5 min
    const key = `apikey:${rec.companyId}:${rec.keyId}`;
    rec.lastUsedAt = new Date().toISOString();
    await env.KV.put(key, JSON.stringify(rec));
  }
}

// ✅ main helper
export async function requireApiKey(env: Env, req: Request): Promise<ApiKeySession | Response> {
  const secret = extractApiKey(req);
  if (!secret) {
    return jsonResponse({ success: false, error: "Missing API key" }, 401);
  }

  const secretHash = await sha256Hex(secret);

  const lookupKey = `apikey_lookup:${secretHash}`;
  const lookup = await env.KV.get(lookupKey, "json") as LookupDoc | null;
  if (!lookup?.companyId || !lookup?.keyId) {
    return jsonResponse({ success: false, error: "Invalid API key" }, 401);
  }

  const recKey = `apikey:${lookup.companyId}:${lookup.keyId}`;
  const rec = await env.KV.get(recKey, "json") as ApiKeyRecord | null;
  if (!rec || rec.revokedAt) {
    return jsonResponse({ success: false, error: "API key revoked" }, 401);
  }

  // Extra safety: ensure stored hash matches lookup hash
  if (rec.secretHash !== secretHash) {
    return jsonResponse({ success: false, error: "Invalid API key" }, 401);
  }

  // best-effort lastUsedAt
  try { await maybeTouchLastUsed(env, rec); } catch {}

  return { companyId: lookup.companyId, keyId: lookup.keyId };
}

// helper for key generation
export function makeSecret(bytes = 32) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return base64Url(arr);
}
export async function hashSecret(secret: string) {
  return sha256Hex(secret);
}
