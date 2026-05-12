import { getCategory } from "../domain/categories.js";
import { getMissingEvidence } from "./nextActionService.js";

export function evaluateCaseCompleteness(problemCase, templates = []) {
  const category = getCategory(problemCase.categoryId);
  const missingFacts = category.questions
    .filter((question) => !String(problemCase.facts?.[question.id] ?? "").trim())
    .map((question) => ({ id: question.id, label: question.label }));
  const missingEvidence = getMissingEvidence(problemCase);
  const hasDocument = Boolean(problemCase.documents?.length);
  const activeTemplates = templates.filter((template) => template.categoryId === problemCase.categoryId && template.isActive);

  const checks = [
    { id: "description", label: "Описание проблемы", done: Boolean(problemCase.description) },
    { id: "facts", label: "Ключевые факты", done: missingFacts.length === 0 },
    { id: "evidence", label: "Пакет доказательств", done: missingEvidence.length === 0 },
    { id: "templates", label: "Активный шаблон документа", done: activeTemplates.length > 0 },
    { id: "document", label: "Документ сформирован", done: hasDocument }
  ];
  const done = checks.filter((check) => check.done).length;

  return {
    score: Math.round((done / checks.length) * 100),
    readyForDocument: missingFacts.length === 0 && missingEvidence.length === 0 && activeTemplates.length > 0,
    checks,
    missingFacts,
    missingEvidence,
    activeTemplates: activeTemplates.map((template) => ({
      id: template.id,
      title: template.title,
      type: template.type,
      variables: template.variables
    }))
  };
}
