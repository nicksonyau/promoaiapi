import { PLANS } from "./plans";
import type { Subscription } from "./types";

export function resolveLimits(sub: Subscription) {
  return PLANS[sub.plan].limits;
}
