import { CATEGORIES } from "../domain/categories.js";

const CATEGORY_RULES = [
  {
    categoryId: "product_return",
    keywords: ["товар", "телефон", "ноутбук", "магазин", "чек", "маркетплейс", "возврат", "сломался", "не включается"]
  },
  {
    categoryId: "housing",
    keywords: ["ук", "жкх", "лифт", "потолок", "протеч", "отопление", "вода", "подъезд", "управляющ", "квартира"]
  },
  {
    categoryId: "poor_service",
    keywords: ["услуг", "ремонт", "исполнитель", "подрядчик", "сервис", "мастер", "заказ", "некачественно"]
  }
];

function scoreCategory(text) {
  const normalized = text.toLowerCase();
  const scores = CATEGORY_RULES.map((rule) => ({
    categoryId: rule.categoryId,
    score: rule.keywords.reduce((sum, keyword) => sum + (normalized.includes(keyword) ? 1 : 0), 0)
  }));

  scores.sort((a, b) => b.score - a.score);
  return scores[0].score > 0 ? scores[0].categoryId : CATEGORIES[0].id;
}

function extractDate(text) {
  const match = text.match(/(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})/);
  return match?.[1] ?? "";
}

function extractFacts(text, categoryId) {
  const lower = text.toLowerCase();
  const facts = {};

  if (categoryId === "product_return") {
    if (lower.includes("телефон")) facts.product_name = "Телефон";
    if (lower.includes("ноутбук")) facts.product_name = "Ноутбук";
    if (lower.includes("не включ")) facts.defect = "Не включается";
    if (lower.includes("слом")) facts.defect = facts.defect ?? "Товар сломался";
    if (lower.includes("деньг") || lower.includes("возврат")) facts.desired_result = "Возврат денег";
    facts.purchase_date = extractDate(text);
  }

  if (categoryId === "housing") {
    if (lower.includes("лифт")) facts.problem_description = "Не работает лифт";
    if (lower.includes("протеч")) facts.problem_description = "Протечка";
    if (lower.includes("потол")) facts.problem_description = facts.problem_description ?? "Проблема с потолком";
    facts.incident_date = extractDate(text);
  }

  if (categoryId === "poor_service") {
    if (lower.includes("ремонт")) facts.service_name = "Ремонт";
    if (lower.includes("некачествен")) facts.quality_problem = "Услуга оказана некачественно";
    if (lower.includes("вернуть") || lower.includes("деньг")) facts.desired_result = "Возврат денег";
    facts.service_date = extractDate(text);
  }

  return Object.fromEntries(Object.entries(facts).filter(([, value]) => Boolean(value)));
}

function detectGoal(text) {
  const lower = text.toLowerCase();
  if (lower.includes("замен")) return "Замена";
  if (lower.includes("ремонт")) return "Ремонт или устранение недостатков";
  if (lower.includes("деньг") || lower.includes("возврат")) return "Возврат денег";
  if (lower.includes("почин") || lower.includes("устран")) return "Устранение проблемы";
  return "Понять следующий шаг";
}

function detectUrgency(text) {
  const lower = text.toLowerCase();
  if (lower.includes("срочно") || lower.includes("авар") || lower.includes("опас")) return "high";
  if (lower.includes("жду") || lower.includes("не отвеч")) return "medium";
  return "normal";
}

export function normalizeOfficialText(text) {
  return text
    .replace(/козлы|уроды|кинули|обманули/gi, "нарушили мои ожидания и не урегулировали ситуацию")
    .replace(/\s+/g, " ")
    .trim();
}

export function analyzeProblem(text = "") {
  const categoryId = scoreCategory(text);
  const category = CATEGORIES.find((item) => item.id === categoryId) ?? CATEGORIES[0];
  const facts = extractFacts(text, categoryId);
  const missingFields = category.questions
    .filter((question) => !facts[question.id])
    .map((question) => ({ id: question.id, label: question.label }));

  return {
    categoryId,
    categoryName: category.name,
    confidence: Object.keys(facts).length > 0 ? 0.78 : 0.55,
    goal: detectGoal(text),
    urgency: detectUrgency(text),
    facts,
    missingFields,
    officialSummary: normalizeOfficialText(text)
  };
}
