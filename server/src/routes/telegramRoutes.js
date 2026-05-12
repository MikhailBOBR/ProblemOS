import { appendAuditLog } from "../services/auditLogService.js";
import { handleTelegramUpdate } from "../services/telegramService.js";
import { requireUser } from "../http/requestContext.js";
import { createBotDraftFromMessage } from "../telegram/botAdapter.js";
import { sanitizeUser } from "../utils/security.js";
import { createHttpError, readJson, sendJson } from "../utils/http.js";

export async function handleTelegramRoutes(req, res, store, { pathname, method }) {
  if (method === "POST" && pathname === "/api/telegram/draft") {
    const body = await readJson(req);
    sendJson(res, 200, createBotDraftFromMessage(String(body.text ?? "")));
    return true;
  }

  if (method === "POST" && pathname === "/api/telegram/link") {
    const { user } = await requireUser(req, store);
    const body = await readJson(req);
    const telegramId = String(body.telegramId ?? "").trim();

    if (!telegramId) {
      throw createHttpError(400, "Укажите Telegram ID");
    }

    const result = await store.mutate((data) => {
      const freshUser = data.users.find((item) => item.id === user.id);
      freshUser.telegramId = telegramId;
      freshUser.updatedAt = new Date().toISOString();
      appendAuditLog(data, {
        actorId: freshUser.id,
        entityType: "user",
        entityId: freshUser.id,
        action: "telegram.linked",
        title: "Telegram ID привязан",
        details: { telegramId }
      });
      return { user: sanitizeUser(freshUser) };
    });

    sendJson(res, 200, result);
    return true;
  }

  if (method === "POST" && pathname === "/api/telegram/webhook") {
    const update = await readJson(req);
    const result = await store.mutate((data) => handleTelegramUpdate(data, update));

    sendJson(res, 200, result);
    return true;
  }

  return false;
}
