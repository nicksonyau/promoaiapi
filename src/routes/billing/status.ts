import { getOrCreateSubscription } from "../../billing/subscription";
import { resolveLimits } from "../../billing/limits";
import { getUsage } from "../../billing/usage";

export async function billingStatus(
  req: Request,
  env: any,
  session: any
) {
  const companyId = session.companyId;

  const sub = await getOrCreateSubscription(env, companyId);
  const limits = resolveLimits(sub);
  const usage = await getUsage(env, companyId);

  return new Response(
    JSON.stringify({
      success: true,
      subscription: sub,
      limits,
      usage,
    }),
    { headers: { "Content-Type": "application/json" } }
  );
}
