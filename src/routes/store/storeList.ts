// src/routes/storeList.ts
import { jsonResponse } from "../_lib/utils";
import { auth } from "../../_lib/auth";

export interface Env {
  KV: KVNamespace;
}

export async function storeListHandler(req: Request, env: Env): Promise<Response> {
  try {
    // 🔐 Check session
    const session = await auth(env, req);
    if (!session) {
      return jsonResponse({ success: false, error: "Unauthorized" }, 401);
    }

    const companyId = session.companyId;
    if (!companyId) {
      return jsonResponse({ success: false, error: "Missing companyId" }, 400);
    }

    const tenantKey = `tenant:${companyId}:stores`;

    const stores = await env.KV.get(tenantKey, { type: "json" }) || [];

    return jsonResponse({
      success: true,
      stores,
    });
  } catch (err: any) {
    return jsonResponse({
      success: false,
      error: err?.message ?? "Store list error",
    }, 500);
  }
}
