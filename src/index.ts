import { loginHandler } from "./routes/login";
import { registerHandler } from "./routes/register";
import { adminUsersHandler } from "./routes/adminUsers";
import { logsHandler } from "./routes/logs";
import { userLogsHandler } from "./routes/userLogs";

import { uploadTemplateHandler } from "./routes/templates/fnbTemplateUpload";
import { listTemplatesHandler } from "./routes/templates/fnbTemplatesList";
import { updateTemplateHandler } from "./routes/templates/fnbTemplateUpdate";
import { getTemplateHandler } from "./routes/templates/fnbTemplateGet";
import { deleteTemplateHandler } from "./routes/templates/fnbTemplateDelete";

import { storeCreateHandler } from "./routes/store/storeCreate";
import { storeListHandler } from "./routes/store/storeList";
import { storeGetHandler } from "./routes/store/storeGet";
import { storeDeleteHandler } from "./routes/store/storeDelete";
import { storeUpdateHandler } from "./routes/store/storeUpdate";
import { storeGetByNameHandler } from "./routes/store/storeGetByName";

import { campaignListHandler } from "./routes/campaign/campaignList";
import { campaignCreateHandler } from "./routes/campaign/campaignCreate";
import { campaignGetHandler } from "./routes/campaign/campaignGet";
import { campaignUpdateHandler } from "./routes/campaign/campaignUpdate";
import { campaignDeleteHandler } from "./routes/campaign/campaignDelete";

import { settingsUpdateHandler } from "./routes/settingsUpdate";
import { userUpdateHandler } from "./routes/userUpdate";
import { userGetHandler } from "./routes/userGet";

import { chatbotBusinessCreateHandler } from "./routes/business/create";
import { chatbotBusinessUpdateHandler } from "./routes/business/update";  
import { chatbotBusinessGetHandler } from "./routes/business/get";

import { chatInitHandler } from "./routes/chatbot/chat_init";
import { chatHandler } from "./routes/chatbot/chat";

import { configCreateHandler } from "./routes/chatbot/configCreate";
import { configUpdateHandler } from "./routes/chatbot/configUpdate";
import { configGetHandler } from "./routes/chatbot/configGet";

import { listChatbots } from "./routes/chatbot/list";
import { deleteChatbot } from "./routes/chatbot/delete";

import { adminDeleteUserHandler } from "./routes/admin-delete-user";

import { verifyHandler } from "./routes/verify";
import { userSendResetPasswordHandler } from "./routes/userSendResetPassword";
import { userCheckResetTokenHandler } from "./routes/userCheckResetToken";
import { userResetPasswordHandler } from "./routes/userResetPassword";

import { voucherUploadHandler } from "./routes/voucher/voucherUpload";
import { voucherCreateHandler } from "./routes/voucher/voucherCreate";
import { voucherListHandler } from "./routes/voucher/voucherList";
import { voucherDetailHandler } from "./routes/voucher/voucherDetail";
import { voucherClaimHandler } from "./routes/voucher/voucherClaim";
import { voucherCheckHandler } from "./routes/voucher/voucherCheck";
import { voucherRedeemHandler } from "./routes/voucher/voucherRedeem";
import { voucherStatsHandler } from "./routes/voucher/voucherStats";
import { voucherDeleteHandler } from "./routes/voucher/voucherDelete";
import { voucherUpdateHandler } from "./routes/voucher/voucherUpdate";

import { r2ProxyHandler } from "./routes/r2Proxy";
import { r2PublicGetHandler } from "./routes/r2PublicGetHandler";
import { storePublishHandler } from "./routes/store/storePublish";
import { resendVerificationHandler } from "./routes/resend";
import { publicCampaignList } from "./routes/public/campaignList";
import { pubVoucherList } from "./routes/public/pubVoucherList";

import { chatbotSourceAddHandler } from "./routes/chatbot/sourceAdd";
import { chatbotSourceListHandler } from "./routes/chatbot/sourceList";
import { chatbotSourceDeleteHandler } from "./routes/chatbot/sourceDelete";
import { chatbotSourceProcessHandler } from "./routes/chatbot/sourceProcess";
import { chatbotFileUploadHandler } from "./routes/chatbot/file/upload";
import { chatbotFileListHandler } from "./routes/chatbot/file/list";
import { chatbotFileDeleteHandler } from "./routes/chatbot/file/delete";
import { chatbotFileProcessHandler } from "./routes/chatbot/file/process";
import { chatbotFileTextUploadHandler } from "./routes/chatbot/file/uploadText";
import { chatbotFileUploadToGPTHandler } from "./routes/chatbot/file/uploadToGPT";
import { chatbotFileAskGPTHandler } from "./routes/chatbot/file/askGPT";
 
import { chatbotSitecrawlerListHandler } from "./routes/chatbot/sitecrawler/sitecrawlerList";
import { chatbotSitecrawlerStartHandler } from "./routes/chatbot/sitecrawler/sitecrawlerStart";
import { chatbotSitecrawlerStatusHandler } from "./routes/chatbot/sitecrawler/sitecrawlerStatus";
import { chatbotSitecrawlerDeleteHandler } from "./routes/chatbot/sitecrawler/sitecrawlerDelete";
import { chatbotSitecrawlerStopHandler } from "./routes/chatbot/sitecrawler/sitecrawlerStop";
 import { chatbotSitecrawlerPagesHandler } from "./routes/chatbot/sitecrawler/sitecrawlerPages";
 import { chatbotSitecrawlerClearHandler } from "./routes/chatbot/sitecrawler/sitecrawlerClear";
 import { leadCapture } from "./routes/chatbot/leadCapture";
 import { leadList } from "./routes/chatbot/leadList";
 import { leadHistory } from "./routes/lead/leadHistory";
 import { chatbotHistoryList } from "./routes/chatbot/historyList";
import { chatbotHistorySession } from "./routes/chatbot/historySession";
import {
  whatsappWebhookVerify,
  whatsappWebhookReceive
} from "./routes/whatsappWebhook";
import { devicesListHandler } from "./routes/devices/list";
import { devicesCreateHandler } from "./routes/devices/create";
import { deviceGetHandler } from "./routes/devices/get";
import { deviceUpdateHandler } from "./routes/devices/update";
import { deviceDeleteHandler } from "./routes/devices/delete";
import { deviceRuntimeUpdateHandler } from "./routes/devices/runtime";
import { contactsListHandler } from "./routes/contacts/list";
import { contactsCreateHandler } from "./routes/contacts/create";
import { contactsDeleteHandler } from "./routes/contacts/delete";
import { contactsImport } from "./routes/contacts/contactsImport";
import { templatesListHandler } from "./routes/watemplates/templatesList";
import { templateCreateHandler } from "./routes/watemplates/templateCreate";
import { broadcastCreateHandler } from "./routes/broadcast/create";
import { broadcastListHandler } from "./routes/broadcast/list";
import { broadcastScheduleHandler } from "./routes/broadcast/schedule";
import { broadcastStartHandler } from "./routes/broadcast/start";
import { broadcastPauseHandler } from "./routes/broadcast/pause";
import { waTemplateGetHandler } from "./routes/watemplates/templateGet";
import { waTemplateUpdateHandler } from "./routes/watemplates/templateUpdate";
import { waTemplateDeleteHandler } from "./routes/watemplates/templateDelete";
import { contactsUpdateHandler } from "./routes/contacts/update";
import { broadcastGetHandler } from "./routes/broadcast/get";
import { broadcastUpdateHandler } from "./routes/broadcast/update";
import { broadcastDeleteHandler } from "./routes/broadcast/delete";
import { subscriptionGetHandler } from "./routes/subscription/get";
import { subscriptionActivateHandler } from "./routes/subscription/activate";
import { subscriptionCheckoutHandler } from "./routes/subscription/subscriptionCheckout";
import { stripeWebhookHandler } from "./routes/api/stripe/stripeWebhook";
import { stripeCheckoutHandler } from "./routes/api/stripe/checkout";
import { subscriptionInvoicesHandler } from "./routes/subscription/invoices";
import { inboxListHandler } from "./routes/inbox/list";
import { inboxGetHandler } from "./routes/inbox/get";
import { inboxMessagesHandler } from "./routes/inbox/messages";
import { inboxSendHandler } from "./routes/inbox/send";
import { inboxUpdateHandler } from "./routes/inbox/update";
import { chatWidgetAppearanceUpdateHandler } from "./routes/chat-widget/appearanceUpdate";
import { chatWidgetAppearanceGetHandler } from "./routes/chat-widget/appearanceGet";
import { chatWidgetAppearanceCreateHandler } from "./routes/chat-widget/appearanceCreate";
import { chatPageCreateHandler } from "./routes/chat-page/create";
import { chatPageGetHandler } from "./routes/chat-page/get";
import { chatPageUpdateHandler } from "./routes/chat-page/update";
import { apiKeyCreateHandler } from "./routes/api-keys/create";
import { apiKeyListHandler } from "./routes/api-keys/list";
import { apiKeyRevokeHandler } from "./routes/api-keys/revoke";
// Webhooks – Event Types
import { eventTypesListHandler } from "./routes/webhooks/event-types/list";
import { eventTypesCreateHandler } from "./routes/webhooks/event-types/create";
import { eventTypesUpdateHandler } from "./routes/webhooks/event-types/update";
import { eventTypesDeleteHandler } from "./routes/webhooks/event-types/delete";

import { webhookSubscriptionsUpdateHandler } from "./routes/webhooks/subscriptions/update";
import { webhookSubscriptionsDeleteHandler } from "./routes/webhooks/subscriptions/delete"
import { webhookSubscriptionsListHandler } from "./routes/webhooks/subscriptions/list";
import { webhookSubscriptionsCreateHandler } from "./routes/webhooks/subscriptions/create";

import { webhookEventsIngestHandler } from "./routes/webhooks/events/ingest";
import { webhookEventsListHandler } from "./routes/webhooks/events/list";
import { webhookEventsGetHandler } from "./routes/webhooks/events/get";

export interface Env {
  KV: KVNamespace;
  MY_R2_BUCKET?: R2Bucket;
  CHAT_HISTORY_KV: KVNamespace;
  // Chatbot KV namespaces (add yours)
  chatbotconfig: KVNamespace;
  chatbotbusiness?: KVNamespace;
  chatbotstore?: KVNamespace;
}
 

const CORS_HEADERS: HeadersInit = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS,DELETE,PUT",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function withCors(res: Response) {
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(CORS_HEADERS)) headers.set(k, v as string);
  return new Response(res.body, { status: res.status, headers });
}


// ------------------------
// MAIN ROUTER
// ------------------------
export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname;

    console.log(`[API] ${req.method} ${path}`);

    // CORS preflight
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    try {
      // ------------------------
      // PUBLIC R2 GET
      // ------------------------
      if (path.startsWith("/r2/") && req.method === "GET") {
        return r2PublicGetHandler(req, env);
      }

    if (path.startsWith("/contacts/update/") && req.method === "PUT") {
      const parts = path.split("/").filter(Boolean);
      const contactId = parts[parts.length - 1];
      return withCors(await contactsUpdateHandler(req, env, contactId));
    }


      // ------------------------
      // AUTH
      // ------------------------
      if (path === "/register" && req.method === "POST")
        return withCors(await registerHandler(req, env));

      if (path === "/login" && req.method === "POST")
        return withCors(await loginHandler(req, env));

      if (path === "/admin/users" && req.method === "GET")
        return withCors(await adminUsersHandler(req, env));

      if (path === "/admin/delete-user" && req.method === "DELETE")
        return withCors(await adminDeleteUserHandler(req, env));

      if (path === "/logs" && req.method === "GET")
        return withCors(await logsHandler(req, env));

      if (path === "/user/logs" && req.method === "GET")
        return withCors(await userLogsHandler(req, env));

// ------------------------
// EMAIL VERIFICATION
// ------------------------
if (path === "/verify" && req.method === "GET")
  return withCors(await verifyHandler(req, env));
// ------------------------
// RESEND EMAIL VERIFICATION
// ------------------------
if (path === "/resend" && req.method === "POST")
  return withCors(await resendVerificationHandler(req, env));


      // ------------------------
      // CHATBOT RUNTIME (MUST COME FIRST)
      // ------------------------
      if (path === "/chatbot/chat_init" && req.method === "GET")
        return withCors(await chatInitHandler(req, env));

      if (path === "/chatbot/chat" && req.method === "POST")
        return withCors(await chatHandler(req, env));

      // ------------------------
      // CHATBOT BUSINESS CONFIG
      // ------------------------
      if (path === "/chatbot/business/create" && req.method === "POST")
        return withCors(await chatbotBusinessCreateHandler(req, env));

      if (path.startsWith("/chatbot/business/update/") && req.method === "PUT")
        return withCors(await chatbotBusinessUpdateHandler(req, env));

      if (path.startsWith("/chatbot/business/get/") && req.method === "GET")
        return withCors(await chatbotBusinessGetHandler(req, env));

      // ------------------------
      // CHATBOT SETTINGS CONFIG
      // ------------------------
      if (path === "/chatbot/configCreate" && req.method === "POST")
        return withCors(await configCreateHandler(req, env));

      if (path.startsWith("/chatbot/configUpdate/") && req.method === "PUT")
        return withCors(await configUpdateHandler(req, env));

      if (path.startsWith("/chatbot/configGet/") && req.method === "GET")
        return withCors(await configGetHandler(req, env));

      // ------------------------
      // CHATBOT LIST + DELETE
      // ------------------------
      if (path === "/chatbot/list" && req.method === "GET")
        return withCors(await listChatbots(req, env));

      if (path.startsWith("/chatbot/delete/") && req.method === "DELETE")
        return withCors(await deleteChatbot(req, env));



if (path === "/watemplates" && req.method === "GET") {
  return withCors(await templatesListHandler(req, env));
}

if (path === "/watemplates/create" && req.method === "POST") {
  return withCors(await templateCreateHandler(req, env));
}
if (path.startsWith("/watemplates/") && req.method === "GET") {
  const id = path.split("/").pop()!;
  return withCors(await waTemplateGetHandler(req, env, id));
}

if (path.startsWith("/watemplates/update/") && req.method === "POST") {
  const id = path.split("/").pop()!;
  return withCors(await waTemplateUpdateHandler(req, env, id));
}
if (path.startsWith("/watemplates/delete/") && req.method === "DELETE") {
  const id = path.split("/").pop()!;
  return withCors(await waTemplateDeleteHandler(req, env, id));
}

      // ------------------------
      // TEMPLATE MANAGEMENT
      // ------------------------
      if (path === "/template/upload" && req.method === "POST")
        return withCors(await uploadTemplateHandler(req, env));

      if (path === "/templates" && req.method === "GET")
        return withCors(await listTemplatesHandler(req, env));

      if (path.startsWith("/template/update/") && req.method === "POST")
        return withCors(await updateTemplateHandler(req, env));

      if (path.startsWith("/template/") && req.method === "GET" && !path.includes("/update/"))
        return withCors(await getTemplateHandler(req, env));

      if (path.startsWith("/template/delete/") && req.method === "DELETE")
        return withCors(await deleteTemplateHandler(req, env));

      // ------------------------
      // STORE (MICROSITE)
      // ------------------------
      if (path === "/store/create" && req.method === "POST")
        return withCors(await storeCreateHandler(req, env));

      if (path.startsWith("/store/update/") && req.method === "PUT")
        return withCors(await storeUpdateHandler(req, env));

      if (path.startsWith("/store/delete/") && req.method === "DELETE")
        return withCors(await storeDeleteHandler(req, env));

      if (url.pathname === "/store/list" && req.method === "GET") {
       return withCors(await storeListHandler(req, env));
      }

      if (path.startsWith("/stores/name/") && req.method === "GET")
        return withCors(await storeGetByNameHandler(req, env));

      if (path.startsWith("/store/") && req.method === "GET")
        return withCors(await storeGetHandler(req, env));

      if (path.startsWith("/store/publish/"))
        return storePublishHandler(req, env);

      // ------------------------
      // CAMPAIGN
      // ------------------------
      if (path === "/campaigns" && req.method === "GET")
        return withCors(await campaignListHandler(req, env));

      if (path === "/campaign/create" && req.method === "POST")
        return withCors(await campaignCreateHandler(req, env));

      if (path.startsWith("/campaign/") && req.method === "GET")
        return withCors(await campaignGetHandler(req, env));

      if (path.startsWith("/campaign/update/") && req.method === "PUT")
        return withCors(await campaignUpdateHandler(req, env));

      if (path.startsWith("/campaign/delete/") && req.method === "DELETE")
        return withCors(await campaignDeleteHandler(req, env));

      // ------------------------
      // SETTINGS + USER
      // ------------------------
      if (path === "/api/settings/update" && req.method === "POST")
        return withCors(await settingsUpdateHandler(req, env));

      if (path === "/user/update" && req.method === "PUT")
        return withCors(await userUpdateHandler(req, env));

      if (path === "/user/me" && req.method === "GET")
        return withCors(await userGetHandler(req, env));

      // Reset password group
      if (req.method === "POST" && path.endsWith("/user/send-reset-password"))
        return withCors(await userSendResetPasswordHandler(req, env));

      if (path === "/user/check-reset-token" && req.method === "GET")
        return withCors(await userCheckResetTokenHandler(req, env));

      if (path === "/user/reset-password" && req.method === "POST")
        return withCors(await userResetPasswordHandler(req, env));

      // ------------------------
      // VOUCHERS
      // ------------------------
      if (path === "/voucher/create" && req.method === "POST")
        return withCors(await voucherCreateHandler(req, env));

      if (path === "/voucher/upload" && req.method === "POST")
        return withCors(await voucherUploadHandler(req, env));

      if (path === "/voucher/list" && req.method === "GET")
        return withCors(await voucherListHandler(req, env));

      if (path === "/voucher/detail" && req.method === "GET")
        return withCors(await voucherDetailHandler(req, env));

      if (path === "/voucher/claim" && req.method === "POST")
        return withCors(await voucherClaimHandler(req, env));

      if (path === "/voucher/redeem" && req.method === "POST")
        return withCors(await voucherRedeemHandler(req, env));

      if (path === "/voucher/stats" && req.method === "GET")
        return withCors(await voucherStatsHandler(req, env));

      if (path === "/voucher/check" && req.method === "GET")
        return withCors(await voucherCheckHandler(req, env));

      if (path.startsWith("/voucher/delete/") && req.method === "DELETE")
        return withCors(await voucherDeleteHandler(req, env));

      if (path.startsWith("/voucher/update/") && req.method === "PUT")
        return withCors(await voucherUpdateHandler(req, env));

    if (path === "/public/voucher/list" && req.method === "GET") {
      return withCors(await pubVoucherList(req, env));
    }
if (path === "/chatbot/sources/add" && req.method === "POST")
  return withCors(await chatbotSourceAddHandler(req, env));

if (path.startsWith("/chatbot/sources/list/") && req.method === "GET")
  return withCors(await chatbotSourceListHandler(req, env, path.split("/").pop()!));

if (path.startsWith("/chatbot/sources/delete/") && req.method === "DELETE")
  return withCors(await chatbotSourceDeleteHandler(req, env, path.split("/").pop()!));
if (path.startsWith("/chatbot/sources/process/") && req.method === "POST")
  return withCors(await chatbotSourceProcessHandler(req, env, path.split("/").pop()!));

// ------------------------
// CHATBOT FILE SOURCES
// ------------------------
if (path === "/chatbot/files/upload" && req.method === "POST")
  return withCors(await chatbotFileUploadHandler(req, env));

if (path.startsWith("/chatbot/files/list/") && req.method === "GET")
  return withCors(await chatbotFileListHandler(req, env, path.split("/").pop()!));

if (path.startsWith("/chatbot/files/delete/") && req.method === "DELETE")
  return withCors(await chatbotFileDeleteHandler(req, env, path.split("/").pop()!));

if (path.startsWith("/chatbot/files/process/") && req.method === "POST")
  return withCors(await chatbotFileProcessHandler(req, env, path.split("/").pop()!));

if (path === "/chatbot/files/uploadText" && req.method === "POST")
  return withCors(await chatbotFileTextUploadHandler(req, env));

if (path.startsWith("/chatbot/files/uploadToGPT/") && req.method === "POST") {
  const id = path.split("/").pop()!;
  return withCors(await chatbotFileUploadToGPTHandler(req, env, id));
}
if (req.method === "POST" && path.startsWith("/chatbot/files/askGPT/")) {
  const id = path.split("/").pop()!;
  return withCors(await chatbotFileAskGPTHandler(req, env, id));
}

if (path.startsWith("/chatbot/sitecrawler/")) {
  console.log("🟢 ===========================Sitecrawler router matched:", path);
}

if (path === "/chatbot/sitecrawler/create" && req.method === "POST") {
  return withCors(await chatbotSitecrawlerClearHandler(req, env));
}

if (path.startsWith("/chatbot/sitecrawler/list/") && req.method === "GET") {
  return withCors(await chatbotSitecrawlerListHandler(req, env));
}

if (path.startsWith("/chatbot/sitecrawler/start/") && req.method === "POST") {
  return withCors(await chatbotSitecrawlerStartHandler(req, env));
}

if (path.startsWith("/chatbot/sitecrawler/status/") && req.method === "GET") {
  return withCors(await chatbotSitecrawlerStatusHandler(req, env));
}

if (path.startsWith("/chatbot/sitecrawler/delete/") && req.method === "DELETE") {
  return withCors(await chatbotSitecrawlerDeleteHandler(req, env));
}

if (path.startsWith("/chatbot/sitecrawler/stop/") && req.method === "POST") {
  return withCors(await chatbotSitecrawlerStopHandler(req, env));
}

if (path.startsWith("/chatbot/sitecrawler/pages/") && req.method === "GET") {
  console.log("✅ ROUTER HIT: PAGES");
  return withCors(await chatbotSitecrawlerPagesHandler(req, env));
}
if (path.startsWith("/chatbot/sitecrawler/clear/") && req.method === "DELETE") {
  const id = path.split("/").pop()!;
  console.log("🧹 ROUTER HIT: CLEAR", id);
  return withCors(await chatbotSitecrawlerClearHandler(req, env));
}
if (path === "/lead/capture" && req.method === "POST")
  return withCors(await leadCapture(req, env));

if (path === "/lead/list" && req.method === "GET")
  return withCors(await leadList(req, env));

if (path === "/lead/history" && req.method === "GET")
  return withCors(await leadHistory(req, env));

if (path.startsWith("/chatbot/history/list/") && req.method === "GET") {
  const chatbotId = path.split("/").pop()!;
  return withCors(await chatbotHistoryList(req, env, chatbotId));
}

if (path.startsWith("/chatbot/history/session/") && req.method === "GET") {
  const parts = path.split("/");
  const chatbotId = parts[parts.length - 2];
  const sessionId = parts[parts.length - 1];
  return withCors(await chatbotHistorySession(req, env, chatbotId, sessionId));
}
if (path === "/whatsapp/webhook" && req.method === "GET") {
  return await whatsappWebhookVerify(req);
}

if (path === "/whatsapp/webhook" && req.method === "POST") {
  return await whatsappWebhookReceive(req, env);
}

// ------------------------
// WHATSAPP DEVICES
// ------------------------
if (path === "/devices" && req.method === "GET") {
  return withCors(await devicesListHandler(req, env));
}

if (path === "/devices/create" && req.method === "POST") {
  return withCors(await devicesCreateHandler(req, env));
}

if (path.startsWith("/devices/update/") && req.method === "POST") {
  const sessionId = path.split("/").pop()!;
  return withCors(await deviceUpdateHandler(req, env, sessionId));
}

if (path.startsWith("/devices/runtime/") && req.method === "POST") {
  const sessionId = path.split("/").pop()!;
  return withCors(await deviceRuntimeUpdateHandler(req, env, sessionId));
}

if (path.startsWith("/devices/delete/") && req.method === "DELETE") {
  const sessionId = path.split("/").pop()!;
  return withCors(await deviceDeleteHandler(req, env, sessionId));
}

if (path.startsWith("/devices/") && req.method === "GET") {
  const sessionId = path.split("/").pop()!;
  return withCors(await deviceGetHandler(req, env, sessionId));
}
if (path === "/contacts" && req.method === "GET") {
  return withCors(await contactsListHandler(req, env));
}

if (path === "/contacts/create" && req.method === "POST") {
  return withCors(await contactsCreateHandler(req, env));
}

if (path.startsWith("/contacts/delete/") && req.method === "DELETE") {
  const contactId = path.split("/").pop()!;
  return withCors(await contactsDeleteHandler(req, env, contactId));
}
if (path === "/contacts/import" && req.method === "POST") {
  return withCors(await contactsImport(req, env));
}

if (path === "/broadcast/create" && req.method === "POST") {
  return withCors(await broadcastCreateHandler(req, env));
}

if (path === "/broadcast/list" && req.method === "GET") {
  return withCors(await broadcastListHandler(req, env));
}

if (path === "/broadcast/schedule" && req.method === "POST") {
  return withCors(await broadcastScheduleHandler(req, env));
}

if (path === "/broadcast/start" && req.method === "POST") {
  ctx.waitUntil(broadcastStartHandler(req, env));
  return withCors(
    new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    })
  );
}

if (path === "/broadcast/pause" && req.method === "POST") {
  return withCors(await broadcastPauseHandler(req, env));
}
if (path.startsWith("/broadcast/get/") && req.method === "GET") {
  const id = path.split("/").pop()!;
  return withCors(await broadcastGetHandler(req, env, id));
}

if (path.startsWith("/broadcast/update/") && req.method === "POST") {
  const id = path.split("/").pop()!;
  return withCors(await broadcastUpdateHandler(req, env, id));

}
if (path === "/broadcast/delete" && req.method === "POST") {
  return withCors(await broadcastDeleteHandler(req, env)); 
}
if (path === "/subscription/get" && req.method === "GET") {
  return withCors(await subscriptionGetHandler(req, env));  
}
if (path === "/subscription/activate" && req.method === "POST") {
  return withCors(await subscriptionActivateHandler(req, env));
}

if (path === "/subscription/checkout" && req.method === "POST") {
  return withCors(await subscriptionCheckoutHandler(req, env));
}
if (path === "/stripe/webhook" && req.method === "POST") {
  return withCors(await stripeWebhookHandler(req, env));
}
if (path === "/subscription/invoices" && req.method === "GET") {
  return withCors(await subscriptionInvoicesHandler(req, env));
}

// ------------------------
// INBOX
// ------------------------
if (path === "/inbox/list" && req.method === "GET") {
  return withCors(await inboxListHandler(req, env));
}

if (path === "/inbox/get" && req.method === "GET") {
  return withCors(await inboxGetHandler(req, env));
}

if (path === "/inbox/messages" && req.method === "GET") {
  return withCors(await inboxMessagesHandler(req, env));
}

if (path === "/inbox/send" && req.method === "POST") {
  return withCors(await inboxSendHandler(req, env));
}

if (path === "/inbox/update" && req.method === "POST") {
  return withCors(await inboxUpdateHandler(req, env));
}

if (path.startsWith("/chat-widget/appearance/update/") && req.method === "PUT") {
  const widgetId = path.split("/").pop()!;
  return withCors(await chatWidgetAppearanceUpdateHandler(req, env, widgetId));
}

// 4️⃣ GET  ✅
if (path.startsWith("/chat-widget/appearance/get/") && req.method === "GET") {
  const widgetId = path.split("/").pop()!;
  return withCors(await chatWidgetAppearanceGetHandler(req, env, widgetId));
}

if (path === "/chat-widget/appearance/create" && req.method === "POST") {
  return withCors(await chatWidgetAppearanceCreateHandler(req, env));
}

if (path === "/chat-page/create" && req.method === "POST") {
  return withCors(await chatPageCreateHandler(req, env));
}

// GET
if (path.startsWith("/chat-page/get/") && req.method === "GET") {
  const widgetId = path.split("/").pop() || "";
  return withCors(await chatPageGetHandler(req, env, widgetId));
}

// UPDATE
if (path.startsWith("/chat-page/update/") && req.method === "PUT") {
  const widgetId = path.split("/").pop() || "";
  return withCors(await chatPageUpdateHandler(req, env, widgetId));
}

if (path === "/api-keys/create" && req.method === "POST")
  return withCors(await apiKeyCreateHandler(req, env));

if (path === "/api-keys/list" && req.method === "GET")
  return withCors(await apiKeyListHandler(req, env));

if (path.startsWith("/api-keys/revoke/") && req.method === "POST") {
  const hash = path.split("/").pop()!;
  return withCors(await apiKeyRevokeHandler(req, env, hash));
}

if (path === "/events" && req.method === "POST")
  return withCors(await eventIngestHandler(req, env));

if (path === "/webhooks/event-types/list" && req.method === "GET")
  return withCors(await eventTypesListHandler(req, env));

if (path === "/webhooks/event-types/create" && req.method === "POST")
  return withCors(await eventTypesCreateHandler(req, env));

if (path.startsWith("/webhooks/event-types/update/") && req.method === "PUT") {
  const id = path.split("/").pop()!;
  return withCors(await eventTypesUpdateHandler(req, env, id));
}

if (path.startsWith("/webhooks/event-types/delete/") && req.method === "DELETE") {
  const id = path.split("/").pop()!;
  return withCors(await eventTypesDeleteHandler(req, env, id));
}

if (path === "/webhooks/event-types/list" && req.method === "GET")
  return withCors(await eventTypesListHandler(req, env));

if (path === "/webhooks/event-types/create" && req.method === "POST")
  return withCors(await eventTypesCreateHandler(req, env));

if (path.startsWith("/webhooks/event-types/update/") && req.method === "PUT") {
  const id = path.split("/").pop()!;
  return withCors(await eventTypesUpdateHandler(req, env, id));
}

if (path.startsWith("/webhooks/event-types/delete/") && req.method === "DELETE") {
  const id = path.split("/").pop()!;
  return withCors(await eventTypesDeleteHandler(req, env, id));
}

if (path === "/webhooks/subscriptions/list" && req.method === "GET")
  return withCors(await webhookSubscriptionsListHandler(req, env));

if (path === "/webhooks/subscriptions/create" && req.method === "POST")
  return withCors(await webhookSubscriptionsCreateHandler(req, env));

if (path.startsWith("/webhooks/subscriptions/update/") && req.method === "PUT") {
  const id = path.split("/").pop()!;
  return withCors(await webhookSubscriptionsUpdateHandler(req, env, id));
}
if (path.startsWith("/webhooks/subscriptions/delete/") && req.method === "DELETE") {
  const id = path.split("/").pop()!;
  return withCors(await webhookSubscriptionsDeleteHandler(req, env, id));
}

if (path === "/webhooks/events/list" && req.method === "GET") {
  return withCors(await webhookEventsListHandler(req, env));
}

if (path.startsWith("/webhooks/events/get/") && req.method === "GET") {
  const id = path.split("/").pop()!;
  return withCors(await webhookEventsGetHandler(req, env, id));
}

if (path === "/webhooks/events/list" && req.method === "GET") {
  return withCors(await webhookEventsListHandler(req, env));
}

if (path.startsWith("/webhooks/events/get/") && req.method === "GET") {
  const id = path.split("/").pop()!;
  return withCors(await webhookEventsGetHandler(req, env, id));
}
      return withCors(
        new Response(JSON.stringify({ error: "Not Found" }), { 
          status: 404, 
          headers: { "Content-Type": "application/json" }
        })
      );

    } catch (e: any) {
      return withCors(
        new Response(JSON.stringify({ error: e?.message || "Server Error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        })
      );
    }
  },
};
