import { Env } from "../../index";
import { jsonResponse } from "../_lib/utils";
import { requireCompany } from "../../_lib/auth";
import { makeSecret, hashSecret } from "./_lib/apiKeyAuth";

type ApiKeyRecord = {
  keyId: string;
  companyId: string;
  name: string;
  prefix: string;
  secretHash: string;
  createdAt: string;
  revokedAt?: string | null;
  lastUsedAt?: string | null;
};

export async function apiKeyCreateHandler(req: Request, env: Env) {
  try {
    if (req.method !== "POST") {
      return jsonResponse({ success: false, error: "Method not allowed" }, 405);
    }

    const session = await requireCompany(env, req);
    if (!session?.companyId) {
      return jsonResponse({ success: false, error: "Unauthorized" }, 401);
    }

    const body = await req.json().catch(() => null);
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    if (!name) {
      return jsonResponse({ success: false, error: "Missing name" }, 400);
    }

    const keyId = crypto.randomUUID();
    const secretPart = makeSecret(32);

    // Display prefix similar to Hook0 style
    const prefix = `phk_${keyId.replace(/-/g, "").slice(0, 12)}`;
    const secret = `${prefix}.${secretPart}`;

    const secretHash = await hashSecret(secret);

    // store record (no raw secret)
    const rec: ApiKeyRecord = {
      keyId,
      companyId: session.companyId,
      name,
      prefix,
      secretHash,
      createdAt: new Date().toISOString(),
      revokedAt: null,
      lastUsedAt: null,
    };

    const recKey = `apikey:${session.companyId}:${keyId}`;
    const lookupKey = `apikey_lookup:${secretHash}`;

    // prevent hash collision (extremely unlikely, but safe)
    const existingLookup = await env.KV.get(lookupKey);
    if (existingLookup) {
      return jsonResponse({ success: false, error: "Please retry" }, 409);
    }

    await env.KV.put(recKey, JSON.stringify(rec));
    await env.KV.put(lookupKey, JSON.stringify({ companyId: session.companyId, keyId }));

    // optional audit
    try {
      const akey = `audit:${session.companyId}:${Date.now()}:apikey_create:${keyId}`;
      await env.KV.put(akey, JSON.stringify({ keyId, name, at: new Date().toISOString() }), {
        expirationTtl: 60 * 60 * 24 * 30,
      });
    } catch {}

    // ✅ RETURN SECRET ONCE (like Stripe / Hook0)
    return jsonResponse({
      success: true,
      data: {
        keyId,
        name,
        prefix,
        secret, // show only once
        createdAt: rec.createdAt,
      },
    });
  } catch (e: any) {
    return jsonResponse({ success: false, error: e?.message || "Server error" }, 500);
  }
}
