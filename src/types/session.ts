export type TemplateStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "rejected"
  | "paused";

export type TemplateCategory =
  | "MARKETING"
  | "UTILITY"
  | "AUTHENTICATION";

export type TemplateComponent =
  | { type: "HEADER"; format: "TEXT"; text: string }
  | { type: "BODY"; text: string }
  | { type: "FOOTER"; text: string }
  | {
      type: "BUTTONS";
      buttons: {
        type: "QUICK_REPLY" | "URL" | "PHONE_NUMBER";
        text: string;
        url?: string;
        phone?: string;
      }[];
    };

export type WhatsAppTemplate = {
  id: string;
  companyId: string;

  name: string; // snake_case
  language: string; // en, zh_CN, ms
  category: TemplateCategory;
  status: TemplateStatus;

  components: TemplateComponent[];

  createdAt: string;
  updatedAt: string;
};
