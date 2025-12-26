import { Env } from "../../index";
import { jsonResponse } from "../_lib/utils";
import { requireCompany } from "../../_lib/auth";

type ApiKeyRecord = {
  keyId: string;
  companyId: string;
  name: string;
  prefix: string;
  createdAt: string;
  revokedAt?: string | null;
  lastUsedAt?: string | null;
};

export async function apiKeyListHandler(req: Request, env: Env) {
  try {
    if (req.method !== "GET") {
      return jsonResponse({ success: false, error: "Method not allowed" }, 405);
    }

    const session = await requireCompany(env, req);
    if (!session?.companyId) {
      return jsonResponse({ success: false, error: "Unauthorized" }, 401);
    }

    const url = new URL(req.url);
    const limitRaw = url.searchParams.get("limit");
    const cursor = url.searchParams.get("cursor") || undefined;

    const limit = Math.max(1, Math.min(50, Number(limitRaw || "20") || 20));
    const prefix = `apikey:${session.companyId}:`;

    const listed = await env.KV.list({ prefix, limit, cursor });

    const items: ApiKeyRecord[] = [];
    for (const k of listed.keys) {
      const rec = await env.KV.get(k.name, "json") as any;
      if (!rec) continue;

      // never leak secretHash
      items.push({
        keyId: rec.keyId,
        companyId: rec.companyId,
        name: rec.name,
        prefix: rec.prefix,
        createdAt: rec.createdAt,
        revokedAt: rec.revokedAt ?? null,
        lastUsedAt: rec.lastUsedAt ?? null,
      });
    }

    // sort newest first (KV list order isn’t guaranteed)
    items.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

    return jsonResponse({
      success: true,
      data: {
        items,
        cursor: listed.cursor || null,
        list_complete: listed.list_complete ?? true,
      },
    });
  } catch (e: any) {
    return jsonResponse({ success: false, error: e?.message || "Server error" }, 500);
  }
}
