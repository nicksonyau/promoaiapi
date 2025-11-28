// src/_lib/auth.ts
import type { Env } from "./utils";

/**
 * Simple auth: returns full session object or null
 */
export async function auth(env: Env, req: Request) {
  const header = req.headers.get("Authorization") || "";
  if (!header.startsWith("Bearer ")) return null;

  const token = header.slice(7).trim();
  if (!token) return null;

  const sessionStr = await env.KV.get(`session:${token}`);
  if (!sessionStr) return null;

  try {
    return JSON.parse(sessionStr);
  } catch {
    return null;
  }
}

/**
 * Extracts the tenant companyId only
 */
export async function getCompanyId(env: Env, req: Request): Promise<string | null> {
  const session = await auth(env, req);
  if (!session) return null;
  return session.companyId || null;
}

/**
 * Enforce login & tenant — returns { session, companyId } or null
 */
export async function requireCompany(env: Env, req: Request) {
  const session = await auth(env, req);
  if (!session || !session.companyId) return null;

  return {
    session,
    companyId: session.companyId,
  };
}
