import { Env } from "../../index";

/**
 * Local JSON helper (safe, explicit)
 * Avoids accidental missing imports
 */
function json(res: any, status = 200) {
  return new Response(JSON.stringify(res), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function broadcastListHandler(req: Request, env: Env) {
  try {
    // ⚠️ TEMP: no company isolation until auth is wired
    // const companyId = (req as any).companyId;

    const list = await env.KV.list({ prefix: "broadcast:" });

    const broadcasts: any[] = [];

    for (const key of list.keys) {
      const raw = await env.KV.get(key.name);
      if (!raw) continue;

      const b = JSON.parse(raw);

      // 🔒 Enable later when auth is ready
      // if (b.companyId !== companyId) continue;

      broadcasts.push({
        id: b.id,
        name: b.name || "Untitled Broadcast",
        status: b.status || "draft",
        createdAt: new Date(b.createdAt).toISOString(),
        audienceCount: b.totalRecipients ?? 0,
      });
    }

    // newest first
    broadcasts.sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt)
    );

    return json({
      success: true,
      broadcasts,
    });
  } catch (e: any) {
    console.error("[broadcast:list] error", e);
    return json(
      { success: false, error: e?.message || "Server error" },
      500
    );
  }
}
