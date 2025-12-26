import { Env } from "../../index";
import { jsonResponse } from "../../_lib/utils";
import { auth } from "../../_lib/auth";

export async function leadCapture(req: Request, env: Env) {
  try {
    // ----------------------------------
    // METHOD GUARD
    // ----------------------------------
    if (req.method !== "POST") {
      return jsonResponse({ success: false, error: "Method not allowed" }, 405);
    }

    // ----------------------------------
    // AUTH
    // ----------------------------------
    const session = await auth(env, req);
    if (!session || !session.companyId) {
      return jsonResponse({ success: false, error: "Unauthorised" }, 401);
    }

    // ----------------------------------
    // BODY PARSE
    // ----------------------------------
    const body = await req.json();

    const {
      chatbotId,
      sessionId,
      phone,
      email,
      name,
      source = "chatbot"
    } = body;

    // ----------------------------------
    // VALIDATION
    // ----------------------------------
    if (!chatbotId || !sessionId) {
      return jsonResponse(
        { success: false, error: "Missing chatbotId or sessionId" },
        400
      );
    }

    if (!phone && !email) {
      return jsonResponse(
        { success: false, error: "Phone or email required" },
        400
      );
    }

    const companyId = session.companyId;
    const leadId = crypto.randomUUID();
    const now = Date.now();

    const normalizedPhone = phone ? String(phone).replace(/\D/g, "") : undefined;
    const normalizedEmail = email ? String(email).toLowerCase() : undefined;

    // ----------------------------------
    // DEDUPE KEY (BY PHONE / EMAIL)
    // ----------------------------------
    const dedupeKey =
      normalizedPhone
        ? `${companyId}:phone:${normalizedPhone}`
        : `${companyId}:email:${normalizedEmail}`;

    const existingKey = await env.LEADS_KV.get(`lead:index:${dedupeKey}`);
    let leadKey: string;

    // ----------------------------------
    // CREATE / UPDATE RECORD
    // ----------------------------------
    if (existingKey) {
      // Update existing
      leadKey = existingKey;
      const existing = await env.LEADS_KV.get(existingKey, { type: "json" });

      const record = {
        ...existing,
        name: name || existing?.name,
        phone: normalizedPhone || existing?.phone,
        email: normalizedEmail || existing?.email,
        chatbotId,
        sessionId,
        updatedAt: now
      };

      await env.LEADS_KV.put(leadKey, JSON.stringify(record));
    } else {
      // New lead
      leadKey = `lead:${companyId}:${leadId}`;

      const record = {
        id: leadId,
        chatbotId,
        sessionId,
        companyId,
        name: name || null,
        phone: normalizedPhone || null,
        email: normalizedEmail || null,
        source,
        status: "new",
        createdAt: now,
        updatedAt: now
      };

      await env.LEADS_KV.put(leadKey, JSON.stringify(record));

      // Create dedupe index
      await env.LEADS_KV.put(`lead:index:${dedupeKey}`, leadKey);
    }

    // ----------------------------------
    // RESPONSE
    // ----------------------------------
    return jsonResponse({ success: true }, 201);

  } catch (err: any) {
    console.error("[LEAD_CAPTURE]", err);
    return jsonResponse(
      { success: false, error: err.message || "Lead capture failed" },
      500
    );
  }
}
