import { createId, nowIso } from "../utils/id.js";

export function createAuditLog({ actorId = "", caseId = "", entityType, entityId = "", action, title, details = {} }) {
  return {
    id: createId("audit"),
    actorId,
    caseId,
    entityType,
    entityId,
    action,
    title,
    details,
    createdAt: nowIso()
  };
}

export function appendAuditLog(data, input) {
  const entry = createAuditLog(input);
  data.auditLogs.push(entry);
  return entry;
}

export function getAuditLogsForCase(data, caseId) {
  return (data.auditLogs ?? [])
    .filter((entry) => entry.caseId === caseId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getAuditLogsForUser(data, userId) {
  return (data.auditLogs ?? [])
    .filter((entry) => entry.actorId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
