import { analyzeProblem } from "../services/aiService.js";

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
