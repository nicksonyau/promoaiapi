export function routeIntent(intent: string, userMsg: string) {
  const text = (intent + " " + userMsg).toLowerCase();

  const rules = [
    { category: "booking", keywords: ["booking", "book", "reserve", "reservation", "appointment", "schedule"] },
    { category: "info", keywords: ["info", "business", "about", "介绍"] },
    { category: "promotions", keywords: ["promo", "promotion", "discount", "优惠"] },
    { category: "products", keywords: ["product", "service", "menu", "卖什么"] },
    { category: "best_sellers", keywords: ["best seller", "bestseller", "畅销"] },
    { category: "location", keywords: ["location", "address", "哪里"] },
    { category: "opening_hours", keywords: ["opening", "hour", "营业"] },
    { category: "contact", keywords: ["whatsapp", "contact", "call", "联络"] },
    { category: "question", keywords: ["ask", "question", "query"] },
    { category: "voucher", keywords: ["voucher", "redeem", "claim", "优惠券"] },
    // lead-only category (NO booking here)
    { category: "lead_form", keywords: ["quote", "price", "package"] },
    { category: "signup", keywords: ["signup", "register", "sign up"] },
    { category: "login", keywords: ["login", "signin"] },
  ];

  for (const rule of rules) {
    if (rule.keywords.some(k => text.includes(k))) return rule.category;
  }

  return "unknown";
}
