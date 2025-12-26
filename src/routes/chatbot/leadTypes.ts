export interface Lead {
  phone?: string;
  email?: string;
  sessionId: string;
  companyId: string;
  source: string;       // chatbot | whatsapp | micropage | social
  status: "new" | "qualified" | "converted";
  stage: "NEW" | "EDUCATION" | "OFFER" | "CLOSING" | "DONE";
  lastMessage?: string;
  createdAt: number;
  updatedAt: number;
}
