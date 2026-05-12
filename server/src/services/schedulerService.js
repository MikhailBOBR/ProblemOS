import { appendAuditLog } from "./auditLogService.js";
import { createNotification } from "./notificationService.js";

const DAY_MS = 24 * 60 * 60 * 1000;

function notificationExists(data, dedupeKey) {
  return data.notifications.some((notification) => notification.dedupeKey === dedupeKey);
}

function buildDeadlineCandidate(problemCase, now = new Date()) {
  if (!problemCase.deadlineAt || problemCase.status === "closed") {
    return null;
  }

  const deadline = new Date(problemCase.deadlineAt);
  const diff = deadline.getTime() - now.getTime();

  if (diff < 0) {
    return {
      type: "deadline_missed",
      title: "Срок по делу истек",
      message: `По делу "${problemCase.title}" срок ответа истек. Можно переходить к эскалации.`,
      dedupeKey: `${problemCase.id}:deadline_missed:${deadline.toISOString().slice(0, 10)}`
    };
  }

  if (diff <= DAY_MS) {
    return {
      type: "deadline_soon",
      title: "Дедлайн уже близко",
      message: `По делу "${problemCase.title}" срок наступит в течение суток.`,
      dedupeKey: `${problemCase.id}:deadline_soon:${deadline.toISOString().slice(0, 10)}`
    };
  }

  return null;
}

export function runDeadlineScheduler(data, { actorId = "system", now = new Date(), userId = "" } = {}) {
  const created = [];
  const consideredCases = data.cases.filter((problemCase) => !userId || problemCase.userId === userId);

  for (const problemCase of consideredCases) {
    const candidate = buildDeadlineCandidate(problemCase, now);
    if (!candidate || notificationExists(data, candidate.dedupeKey)) {
      continue;
    }

    const notification = createNotification({
      userId: problemCase.userId,
      caseId: problemCase.id,
      type: candidate.type,
      title: candidate.title,
      message: candidate.message,
      sendAt: now.toISOString(),
      channel: "in_app",
      dedupeKey: candidate.dedupeKey,
      meta: { deadlineAt: problemCase.deadlineAt }
    });
    data.notifications.push(notification);
    created.push(notification);

    appendAuditLog(data, {
      actorId,
      caseId: problemCase.id,
      entityType: "notification",
      entityId: notification.id,
      action: `notification.${candidate.type}`,
      title: "Уведомление по дедлайну создано",
      details: { deadlineAt: problemCase.deadlineAt, type: candidate.type }
    });
  }

  return {
    created,
    scannedCases: consideredCases.length
  };
}
