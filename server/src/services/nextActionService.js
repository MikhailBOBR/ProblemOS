import { getCategory } from "../domain/categories.js";
import { CASE_STATUS } from "../domain/statuses.js";

export function getMissingEvidence(problemCase) {
  const category = getCategory(problemCase.categoryId);
  const uploadedTypes = new Set(problemCase.evidence.map((item) => item.evidenceType).filter(Boolean));

  return category.requiredEvidence.filter((item) => !uploadedTypes.has(item.id));
}

export function calculateProgress(problemCase) {
  const steps = problemCase.steps ?? [];
  if (steps.length === 0) {
    return { done: 0, total: 0, percent: 0 };
  }

  const done = steps.filter((step) => step.status === "done").length;
  return {
    done,
    total: steps.length,
    percent: Math.round((done / steps.length) * 100)
  };
}

export function buildNextAction(problemCase) {
  const missingEvidence = getMissingEvidence(problemCase);
  const deadlineAt = problemCase.deadlineAt ? new Date(problemCase.deadlineAt) : null;
  const isDeadlineMissed = deadlineAt && deadlineAt.getTime() < Date.now();

  if (problemCase.status === CASE_STATUS.CLOSED) {
    return "Дело закрыто. Можно скачать пакет дела и сохранить историю.";
  }

  if (isDeadlineMissed && [CASE_STATUS.WAITING_RESPONSE, CASE_STATUS.SENT].includes(problemCase.status)) {
    return "Срок ответа истек. Подготовьте эскалацию: жалобу в контролирующий орган или досудебное требование.";
  }

  if (missingEvidence.length > 0) {
    return `Загрузите недостающие доказательства: ${missingEvidence.map((item) => item.label).join(", ")}.`;
  }

  if (!problemCase.documents?.length) {
    return "Доказательства собраны. Сформируйте первый документ по шаблону и проверьте текст перед отправкой.";
  }

  if ([CASE_STATUS.DOCUMENT_READY, CASE_STATUS.EVIDENCE_COLLECTION, CASE_STATUS.FACT_COLLECTION].includes(problemCase.status)) {
    return "Документ подготовлен. Отправьте его адресату и загрузите подтверждение отправки.";
  }

  if (problemCase.status === CASE_STATUS.WAITING_RESPONSE) {
    return "Сейчас лучше ждать ответа. Проверьте дедлайн и сохраните любой ответ организации в доказательства.";
  }

  return "Проверьте карточку дела, обновите факты и нажмите генерацию документа, когда данные готовы.";
}
