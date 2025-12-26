export type SiteStatus = "pending" | "indexing" | "indexed" | "failed" | "stopped";

export interface SiteRecord {
  id: string;
  chatbotId: string;
  companyId: string;
  rootUrl: string;
  maxPages: number;
  status: SiteStatus;
  pagesCrawled: number;
  createdAt: number;
  updatedAt: number;
}
