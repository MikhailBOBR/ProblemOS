import { analyzeProblem } from "../services/aiService.js";

export function extractTelegramMessage(update = {}) {
  const message = update.message ?? update.edited_message ?? update.callback_query?.message ?? {};
  const from = update.message?.from ?? update.edited_message?.from ?? update.callback_query?.from ?? {};
  const chat = message.chat ?? {};

  return {
    updateId: update.update_id ?? "",
    telegramId: String(update.telegramId ?? from.id ?? ""),
    chatId: String(update.chatId ?? chat.id ?? from.id ?? ""),
    text: String(update.text ?? message.text ?? update.callback_query?.data ?? "").trim(),
    raw: update
  };
}

export function createBotDraftFromMessage(text) {
  const analysis = analyzeProblem(text);

  return {
    reply: [
      `Похоже на категорию: ${analysis.categoryName}.`,
      "Могу создать дело и собрать недостающие факты.",
      analysis.missingFields.length
        ? `Сначала нужно уточнить: ${analysis.missingFields.map((field) => field.label).join(", ")}.`
        : "Основные факты уже понятны, можно перейти к доказательствам."
    ].join("\n"),
    analysis,
    suggestedActions: ["Создать дело", "Загрузить фото", "Что делать дальше"]
  };
}

export function formatTelegramCases(cases = []) {
  if (!cases.length) {
    return "У вас пока нет дел. Создайте первое: /newcase описание проблемы";
  }

  return cases
    .slice(0, 8)
    .map((item, index) => `${index + 1}. ${item.title}\nСтатус: ${item.status}\nСледующий шаг: ${item.nextAction}`)
    .join("\n\n");
}

export function formatTelegramNextAction(cases = []) {
  const active = cases.find((item) => item.status !== "closed") ?? cases[0];

  if (!active) {
    return "Нет активных дел. Напишите /newcase и описание проблемы.";
  }

  return `Дело: ${active.title}\nЧто делать дальше: ${active.nextAction}`;
}
