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


 
// ------------------------
// ENV INTERFACE (FINALIZED)
// ------------------------
export interface Env {
  KV: KVNamespace;
  MY_R2_BUCKET?: R2Bucket;
  CHAT_HISTORY_KV: KVNamespace;
  // Chatbot KV namespaces (add yours)
  chatbotconfig: KVNamespace;
  chatbotbusiness?: KVNamespace;
  chatbotstore?: KVNamespace;
}


// ------------------------
// CORS
// ------------------------
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

      // ------------------------
      // NOT FOUND
      // ------------------------
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
