// domain/webhook.ts (can be in same file for now)
export type KV = { key: string; value: string };

export type WebhookEndpoint = {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  url: string;
  headers: KV[];
};

export type WebhookSigning = {
  mode: "none" | "hmac-sha256";
  header?: string;
  secret?: string | null;
};

export type WebhookSubscription = {
  id: string;
  description: string;
  endpoint: WebhookEndpoint;
  eventTypeIds: string[];
  labels: KV[];
  metadata: KV[];
  enabled: boolean;
  signing: WebhookSigning;
  createdAt?: string | null;
  updatedAt?: string | null;
};
