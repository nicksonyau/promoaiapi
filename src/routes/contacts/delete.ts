import { Env } from "../../index";
import { jsonResponse } from "../../_lib/utils";
import { auth } from "../../_lib/auth";

export async function contactsDeleteHandler(
  req: Request,
  env: Env,
  contactId?: string
) {
  try {
    // -----------------------
    // METHOD GUARD
    // -----------------------
    if (req.method !== "DELETE") {
      return jsonResponse({ success: false, error: "Method not allowed" }, 405);
    }

    // -----------------------
    // AUTH
    // -----------------------
    const session = await auth(env, req);
    if (!session?.companyId) {
      return jsonResponse({ success: false, error: "Unauthorized" }, 401);
    }

    const companyId = session.companyId;

    // -----------------------
    // ID (PATH PARAM FIRST, FALLBACK TO QUERY)
    // -----------------------
    let id = contactId || null;

    // Harden against trailing slash or encoded id
    if (id) {
      try {
        id = decodeURIComponent(id);
      } catch {
        // keep as-is
      }
      if (!id.trim()) id = null;
    }

    if (!id) {
      const url = new URL(req.url);
      const qid = url.searchParams.get("id");
      if (qid && qid.trim()) id = qid.trim();
    }

    if (!id) {
      return jsonResponse({ success: false, error: "Missing contact id" }, 400);
    }

    // -----------------------
    // DELETE CONTACT
    // -----------------------
    const contactKey = `contact:${companyId}:${id}`;
    await env.KV.delete(contactKey);

    // -----------------------
    // UPDATE INDEX
    // -----------------------
    const indexKey = `contacts:${companyId}`;
    const ids = (await env.KV.get(indexKey, "json")) as string[] | null;

    if (ids) {
      const nextIds = ids.filter((x) => x !== id);
      await env.KV.put(indexKey, JSON.stringify(nextIds));
    }

    return jsonResponse({ success: true, id });
  } catch (err: any) {
    console.error("[CONTACT_DELETE]", err);
    return jsonResponse({ success: false, error: err.message }, 500);
  }
}
