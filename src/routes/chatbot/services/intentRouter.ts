// src/routes/chatbot/intentRouter.ts

export function routeIntent(intent: string, userMsg: string) {
  const text = (intent + " " + userMsg).toLowerCase();

  const rules = [
    { category: "info", keywords: ["info", "business", "about", "介绍", "información"] },
    { category: "promotions", keywords: ["promo", "promotion", "discount", "优惠"] },
    { category: "products", keywords: ["product", "service", "menu", "卖什么"] },
    { category: "best_sellers", keywords: ["best seller", "bestseller", "畅销"] },
    { category: "location", keywords: ["location", "address", "哪里", "地點"] },
    { category: "opening_hours", keywords: ["opening", "hour", "营业"] },
    { category: "contact", keywords: ["whatsapp", "contact", "call", "联络"] },
    { category: "question", keywords: ["ask", "enquiry", "question", "query"] },

    { category: "voucher", keywords: ["voucher", "redeem", "claim", "优惠券", "兑换", "代金券"] },
    { category: "signup", keywords: ["signup", "register", "sign up", "create account", "注册"] },
    { category: "login", keywords: ["login", "log in", "signin", "sign in", "登入", "登录"] },
  ];

  for (const rule of rules) {
    if (rule.keywords.some((k) => text.includes(k))) {
      return rule.category;
    }
  }
  return "unknown";
}
