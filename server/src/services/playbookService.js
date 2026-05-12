import { appendAuditLog } from "./auditLogService.js";
import { nowIso } from "../utils/id.js";

function normalizeItemList(value, fields) {
  if (!Array.isArray(value)) return null;
  return value
    .map((item) => {
      const result = {};
      for (const field of fields) {
        result[field] = String(item?.[field] ?? "").trim();
      }
      return result;
    })
    .filter((item) => item.id || item.label || item.placeholder);
}

function normalizeStringList(value) {
  if (!Array.isArray(value)) return null;
  return value.map((item) => String(item ?? "").trim()).filter(Boolean);
}

export function updateCategoryPlaybook(data, category, input, actorId) {
  if (input.name !== undefined) category.name = String(input.name).trim() || category.name;
  if (input.shortName !== undefined) category.shortName = String(input.shortName).trim() || category.shortName;
  if (input.description !== undefined) category.description = String(input.description).trim() || category.description;
  if (input.defaultDeadlineDays !== undefined) {
    const days = Number(input.defaultDeadlineDays);
    if (Number.isFinite(days) && days > 0 && days <= 365) {
      category.defaultDeadlineDays = Math.round(days);
    }
  }

  const requiredEvidence = normalizeItemList(input.requiredEvidence, ["id", "label"]);
  if (requiredEvidence) category.requiredEvidence = requiredEvidence;

  const questions = normalizeItemList(input.questions, ["id", "label", "placeholder"]);
  if (questions) category.questions = questions;

  const route = normalizeStringList(input.route);
  if (route) category.route = route;

  category.updatedAt = nowIso();
  category.updatedBy = actorId;

  appendAuditLog(data, {
    actorId,
    entityType: "category",
    entityId: category.id,
    action: "category.playbook_updated",
    title: "Category playbook updated",
    details: {
      categoryId: category.id,
      routeSteps: category.route.length,
      questions: category.questions.length,
      requiredEvidence: category.requiredEvidence.length
    }
  });

  return category;
}
