export const CASE_STATUS = {
  DRAFT: "draft",
  FACT_COLLECTION: "fact_collection",
  EVIDENCE_COLLECTION: "evidence_collection",
  DOCUMENT_READY: "document_ready",
  SENT: "sent",
  WAITING_RESPONSE: "waiting_response",
  DEADLINE_MISSED: "deadline_missed",
  ESCALATION: "escalation",
  CLOSED: "closed"
};

export const STEP_STATUS = {
  TODO: "todo",
  ACTIVE: "active",
  DONE: "done",
  BLOCKED: "blocked"
};

export const CASE_STATUS_META = [
  {
    id: CASE_STATUS.DRAFT,
    label: "Черновик",
    tone: "muted",
    description: "Дело создано, но данных пока недостаточно."
  },
  {
    id: CASE_STATUS.FACT_COLLECTION,
    label: "Сбор фактов",
    tone: "info",
    description: "Нужно уточнить ключевые обстоятельства."
  },
  {
    id: CASE_STATUS.EVIDENCE_COLLECTION,
    label: "Сбор доказательств",
    tone: "warning",
    description: "Нужно приложить подтверждения: фото, чеки, переписку."
  },
  {
    id: CASE_STATUS.DOCUMENT_READY,
    label: "Документ подготовлен",
    tone: "success",
    description: "Документ сформирован, можно переходить к отправке."
  },
  {
    id: CASE_STATUS.SENT,
    label: "Обращение отправлено",
    tone: "info",
    description: "Обращение направлено, сохраните подтверждение отправки."
  },
  {
    id: CASE_STATUS.WAITING_RESPONSE,
    label: "Ожидание ответа",
    tone: "info",
    description: "Сейчас важно дождаться ответа до установленной даты."
  },
  {
    id: CASE_STATUS.DEADLINE_MISSED,
    label: "Срок нарушен",
    tone: "danger",
    description: "Срок ответа истек, можно готовить следующий шаг."
  },
  {
    id: CASE_STATUS.ESCALATION,
    label: "Эскалация",
    tone: "danger",
    description: "Пора готовить жалобу или досудебное требование."
  },
  {
    id: CASE_STATUS.CLOSED,
    label: "Закрыто",
    tone: "muted",
    description: "Дело завершено."
  }
];

export function getStatusMeta(status) {
  return CASE_STATUS_META.find((item) => item.id === status) ?? CASE_STATUS_META[0];
}
