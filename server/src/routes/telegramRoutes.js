import { appendAuditLog } from "../services/auditLogService.js";
import { handleTelegramUpdate } from "../services/telegramService.js";
import { requireUser } from "../http/requestContext.js";
import { parseTelegramLinkRequest, parseTextRequest } from "../dto/requestDtos.js";
import { createRepositories } from "../repositories/index.js";
import { readJsonObject } from "../http/validation.js";
import { presentUser } from "../presenters/responsePresenters.js";
import { createBotDraftFromMessage } from "../telegram/botAdapter.js";
import { sanitizeUser } from "../utils/security.js";
import { sendJson } from "../utils/http.js";

export async function handleTelegramRoutes(req, res, store, { pathname, method }) {
  if (method === "POST" && pathname === "/api/telegram/draft") {
    const { text } = await parseTextRequest(req);
    sendJson(res, 200, createBotDraftFromMessage(text));
    return true;
  }

  if (method === "POST" && pathname === "/api/telegram/link") {
    const { user } = await requireUser(req, store);
    const { telegramId } = await parseTelegramLinkRequest(req);

    const result = await store.mutate((data) => {
      const repos = createRepositories(data);
      const freshUser = repos.users.findById(user.id);
      freshUser.telegramId = telegramId;
      freshUser.updatedAt = new Date().toISOString();
      repos.users.replace(freshUser);
      appendAuditLog(data, {
        actorId: freshUser.id,
        entityType: "user",
        entityId: freshUser.id,
        action: "telegram.linked",
        title: "Telegram ID привязан",
        details: { telegramId }
      });
      return presentUser(sanitizeUser(freshUser));
    });

    sendJson(res, 200, result);
    return true;
  }

  if (method === "POST" && pathname === "/api/telegram/webhook") {
    const update = await readJsonObject(req);
    const result = await store.mutate((data) => handleTelegramUpdate(data, update));

    sendJson(res, 200, result);
    return true;
  }

  return false;
}
