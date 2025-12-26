import { Env } from "../../index";
import { jsonResponse } from "../../_lib/utils";
import { auth } from "../../_lib/auth";

export async function contactsGet(req: Request, env: Env) {
  try {
    if (req.method !== "GET") {
      return jsonResponse(
        { success: false, error: "Method not allowed" },
        405
      );
    }

    const session = await auth(env, req);
    if (!session?.companyId) {
      return jsonResponse(
        { success: false, error: "Unauthorized" },
        401
      );
    }

    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return jsonResponse(
        { success: false, error: "Missing contact id" },
        400
      );
    }

    const key = `contact:${session.companyId}:${id}`;
    const contact = await env.KV.get(key, "json");

    if (!contact) {
      return jsonResponse(
        { success: false, error: "Contact not found" },
        404
      );
    }

    return jsonResponse({
      success: true,
      contact,
    });

  } catch (err: any) {
    console.error("[CONTACT_GET]", err);
    return jsonResponse(
      { success: false, error: err.message },
      500
    );
  }
}
