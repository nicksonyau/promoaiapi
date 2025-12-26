// ✅ File: src/routes/businessUpdate.ts
import { Env } from "../index";

export async function businessUpdateHandler(req: Request, env: Env): Promise<Response> {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId") || "dev-user-1"; // ✅ fallback

    const body = await req.json();

    // Load existing business settings
    const key = `business_${userId}`;
    const existing = (await env.KV.get(key, { type: "json" })) || {};

    const updated = {
      ...existing,
      ...body,
      updatedAt: new Date().toISOString(),
    };

    await env.KV.put(key, JSON.stringify(updated));

    return new Response(
      JSON.stringify({ success: true, business: updated }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error("❌ businessUpdateHandler:", err);
    return new Response(
      JSON.stringify({ error: "Failed to update business" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
