import { Env } from "../../index";
import { jsonResponse } from "../_lib/utils";
import { requireCompany } from "../../_lib/auth";

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

export async function apiKeyRevokeHandler(req: Request, env: Env, keyId: string) {
  try {
    if (req.method !== "POST" && req.method !== "DELETE") {
      return jsonResponse({ success: false, error: "Method not allowed" }, 405);
    }

    const session = await requireCompany(env, req);
    if (!session?.companyId) {
      return jsonResponse({ success: false, error: "Unauthorized" }, 401);
    }

    if (!keyId) {
      return jsonResponse({ success: false, error: "Missing keyId" }, 400);
    }

    const recKey = `apikey:${session.companyId}:${keyId}`;
    const rec = await env.KV.get(recKey, "json") as ApiKeyRecord | null;
    if (!rec) {
      return jsonResponse({ success: false, error: "Not found" }, 404);
    }

    if (rec.revokedAt) {
      return jsonResponse({ success: true, data: { revoked: true } });
    }

    rec.revokedAt = new Date().toISOString();
    await env.KV.put(recKey, JSON.stringify(rec));

    // disable runtime auth immediately
    const lookupKey = `apikey_lookup:${rec.secretHash}`;
    await env.KV.delete(lookupKey);

    try {
      const akey = `audit:${session.companyId}:${Date.now()}:apikey_revoke:${keyId}`;
      await env.KV.put(akey, JSON.stringify({ keyId, at: rec.revokedAt }), {
        expirationTtl: 60 * 60 * 24 * 30,
      });
    } catch {}

    return jsonResponse({ success: true, data: { revoked: true } });
  } catch (e: any) {
    return jsonResponse({ success: false, error: e?.message || "Server error" }, 500);
  }
}
