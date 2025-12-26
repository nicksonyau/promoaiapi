export type BroadcastStatus =
  | "draft"
  | "scheduled"
  | "queued"
  | "running"
  | "paused"
  | "completed";

export interface Broadcast {
  id: string;
  companyId: string;
  name: string;

  templateId: string; // entry template
  status: BroadcastStatus;

  scheduleAt?: string | null;

  audience: {
    phones: string[]; // E.164 only
    total: number;
  };

  metrics: {
    queued: number;
    sent: number;
    failed: number;
  };

  createdAt: string;
  updatedAt: string;
}
