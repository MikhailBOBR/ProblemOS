import { createCaseFromInput } from "./caseService.js";
import { createNotification } from "./notificationService.js";
import { appendAuditLog } from "./auditLogService.js";
import { createBotDraftFromMessage, extractTelegramMessage, formatTelegramCases, formatTelegramNextAction } from "../telegram/botAdapter.js";

export function handleTelegramUpdate(data, update) {
  const message = extractTelegramMessage(update);

  if (!message.telegramId) {
    const error = new Error("В webhook нет Telegram ID");
    error.statusCode = 400;
    error.publicMessage = "В webhook нет Telegram ID";
    throw error;
  }

  const telegramUser = data.users.find((item) => String(item.telegramId) === String(message.telegramId));

  if (!telegramUser) {
    return {
      ok: true,
      chatId: message.chatId,
      text: "Аккаунт не привязан. Откройте сайт ProblemOS и привяжите Telegram ID в профиле."
    };
  }

  const userCases = data.cases.filter((item) => item.userId === telegramUser.id);
  const text = message.text.trim();

  if (text === "/start" || text === "/help") {
    appendAuditLog(data, {
      actorId: telegramUser.id,
      entityType: "telegram",
      entityId: message.telegramId,
      action: "telegram.help",
      title: "Пользователь запросил помощь в Telegram"
    });

    return {
      ok: true,
      chatId: message.chatId,
      text: "ProblemOS готов. Команды: /newcase описание, /mycases, /next."
    };
  }

  if (text === "/mycases") {
    return {
      ok: true,
      chatId: message.chatId,
      text: formatTelegramCases(userCases)
    };
  }

  if (text === "/next") {
    return {
      ok: true,
      chatId: message.chatId,
      text: formatTelegramNextAction(userCases)
    };
  }

  if (text.startsWith("/newcase")) {
    const description = text.replace("/newcase", "").trim();
    if (!description) {
      return {
        ok: true,
        chatId: message.chatId,
        text: "Напишите так: /newcase Купил товар, он сломался, магазин не возвращает деньги"
      };
    }

    const { problemCase, analysis } = createCaseFromInput(telegramUser.id, { description });
    data.cases.push(problemCase);
    data.notifications.push(
      createNotification({
        userId: telegramUser.id,
        caseId: problemCase.id,
        type: "telegram_case_created",
        title: "Дело создано через Telegram",
        message: problemCase.nextAction
      })
    );
    appendAuditLog(data, {
      actorId: telegramUser.id,
      caseId: problemCase.id,
      entityType: "case",
      entityId: problemCase.id,
      action: "case.created.telegram",
      title: "Дело создано через Telegram",
      details: { categoryId: problemCase.categoryId, confidence: analysis.confidence }
    });

    return {
      ok: true,
      chatId: message.chatId,
      caseId: problemCase.id,
      text: `Дело создано: ${problemCase.title}\nКатегория: ${analysis.categoryName}\nСледующий шаг: ${problemCase.nextAction}`
    };
  }

  const draft = createBotDraftFromMessage(text);
  appendAuditLog(data, {
    actorId: telegramUser.id,
    entityType: "telegram",
    entityId: message.telegramId,
    action: "telegram.draft",
    title: "Telegram-сообщение разобрано",
    details: { categoryId: draft.analysis.categoryId }
  });

  return {
    ok: true,
    chatId: message.chatId,
    text: draft.reply,
    suggestedActions: draft.suggestedActions
  };
}
