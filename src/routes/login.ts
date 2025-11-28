import { Env } from "../index";
import { logEvent } from "../services/logger";

export async function loginHandler(req: Request, env: Env): Promise<Response> {
  try {
    const body = await req.json().catch(() => ({}));
    const email = body?.email as string | undefined;
    const password = body?.password as string | undefined;

    const ip =
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-forwarded-for") ||
      null;

    // -----------------------------------------------------
    // 1. VALIDATION
    // -----------------------------------------------------
    if (!email || !password) {
      console.log("[LOGIN] Missing email/password", { email, ip });
      await logEvent(env, "login_failed", null, email ?? null, ip);
      return json({ error: "Email and password required" }, 400);
    }

    // -----------------------------------------------------
    // 2. LOAD USER FROM KV
    // -----------------------------------------------------
    const userStr = await env.KV.get(`user:${email}`);
    if (!userStr) {
      console.log("[LOGIN] User not found", { email, ip });
      await logEvent(env, "login_failed", null, email, ip);
      return json({ error: "Invalid email or password" }, 401);
    }

    const user = JSON.parse(userStr);
    console.log("[LOGIN] Loaded user", {
      id: user.id,
      email: user.email,
      status: user.status,
      companyId: user.companyId,
    });

    // -----------------------------------------------------
    // 3. CHECK PASSWORD
    // -----------------------------------------------------
    const inputHash = await hashPassword(password);
    if (inputHash !== user.passwordHash) {
      console.log("[LOGIN] Wrong password", { email, ip });
      await logEvent(env, "login_failed", user.id ?? null, user.email ?? email, ip);
      return json({ error: "Invalid email or password" }, 401);
    }

    // -----------------------------------------------------
    // 4. CHECK ACCOUNT STATUS
    // -----------------------------------------------------
    if (user.status !== "active") {
      console.log("[LOGIN] Account blocked", {
        email: user.email,
        status: user.status,
        ip,
      });

      await logEvent(env, "login_blocked", user.id, user.email, ip);

      const errorCode =
        user.status === "pending_verification"
          ? "Account not verified"
          : user.status === "suspended"
          ? "Account suspended"
          : "Account disabled";

      return json({ error: errorCode }, 403);
    }

    // -----------------------------------------------------
    // 5. BACKWARD COMPATIBILITY: Assign companyId to old users
    // -----------------------------------------------------
    if (!user.companyId) {
      console.log("[LOGIN] Missing companyId — migrating old account…");

      const newCompanyId = crypto.randomUUID();

      const company = {
        id: newCompanyId,
        name: user.name || user.email,
        ownerEmail: user.email,
        createdAt: new Date().toISOString(),
      };

      await env.KV.put(`company:${newCompanyId}`, JSON.stringify(company));

      user.companyId = newCompanyId;
      await env.KV.put(`user:${email}`, JSON.stringify(user));

      console.log("[LOGIN] Assigned new companyId:", newCompanyId);
    }

    // -----------------------------------------------------
    // 6. CREATE SESSION TOKEN (NEW)
    // -----------------------------------------------------
    const token = crypto.randomUUID();

    const sessionData = {
      userId: user.id,
      email: user.email,
      companyId: user.companyId,
      createdAt: Date.now(),
      ip,
    };

    await env.KV.put(
      `session:${token}`,
      JSON.stringify(sessionData),
      { expirationTtl: 60 * 60 * 24 * 7 } // 7 days
    );

    console.log("[LOGIN] Session created:", token);

    // -----------------------------------------------------
    // 7. SUCCESS RESPONSE WITH TOKEN
    // -----------------------------------------------------
    await logEvent(env, "login_success", user.id, user.email, ip);

    return json({
      success: true,
      token, // 🔥 CRITICAL
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        name: user.name,
        status: user.status,
        companyId: user.companyId,
        role: user.role ?? "admin",
      },
    });

  } catch (err: any) {
    console.error("[LOGIN] Error:", err);
    return json({ error: err?.message || "Server error" }, 500);
  }
}

// ====================================================================
// UTILS
// ====================================================================
async function hashPassword(pw: string) {
  const enc = new TextEncoder().encode(pw);
  const digest = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
