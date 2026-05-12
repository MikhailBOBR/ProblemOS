import { createId, nowIso } from "../utils/id.js";

export function createNotification({
  userId,
  caseId,
  type,
  title,
  message,
  sendAt = nowIso(),
  channel = "in_app",
  dedupeKey = "",
  meta = {}
}) {
  return {
    id: createId("notification"),
    userId,
    caseId,
    type,
    title,
    message,
    isRead: false,
    readAt: null,
    channel,
    dedupeKey,
    meta,
    telegramStatus: "pending",
    telegramDeliveredAt: null,
    telegramError: "",
    sendAt,
    createdAt: nowIso()
  };
}

export function buildDeadlineNotifications(problemCase) {
  if (!problemCase.deadlineAt || problemCase.status === "closed") {
    return [];
  }

  const deadlineTime = new Date(problemCase.deadlineAt).getTime();
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  const diff = deadlineTime - now;

  if (diff < 0) {
    return [
      createNotification({
        userId: problemCase.userId,
        caseId: problemCase.id,
        type: "deadline_missed",
        title: "Срок по делу истек",
        message: `По делу "${problemCase.title}" можно переходить к эскалации.`
      })
    ];
  }

  if (diff <= oneDay) {
    return [
      createNotification({
        userId: problemCase.userId,
        caseId: problemCase.id,
        type: "deadline_soon",
        title: "Дедлайн уже близко",
        message: `По делу "${problemCase.title}" срок наступит в течение суток.`
      })
    ];
  }

  return [];
}
