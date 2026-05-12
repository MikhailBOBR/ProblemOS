import { appendAuditLog } from "./auditLogService.js";
import { createId, nowIso } from "../utils/id.js";

const VISIBILITY = new Set(["user", "internal"]);
const STATUS = new Set(["open", "accepted", "resolved", "archived"]);

export function createExpertRecommendation({ caseId, authorId, text, visibility = "user", status = "open" }) {
  const normalizedText = String(text ?? "").trim();
  if (!normalizedText) {
    throw new Error("Recommendation text is required");
  }

  const now = nowIso();
  return {
    id: createId("recommendation"),
    caseId,
    authorId,
    text: normalizedText,
    visibility: VISIBILITY.has(visibility) ? visibility : "user",
    status: STATUS.has(status) ? status : "open",
    createdAt: now,
    updatedAt: now
  };
}

export function getCaseRecommendations(data, problemCase, viewer) {
  const items = (data.expertRecommendations ?? [])
    .filter((item) => item.caseId === problemCase.id)
    .filter((item) => {
      if (viewer?.role === "admin") return true;
      if (viewer?.role === "expert" && problemCase.expertId === viewer.id) return true;
      return item.visibility === "user";
    })
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  return items.map((item) => ({
    ...item,
    author: data.users.find((user) => user.id === item.authorId)
      ? {
          id: item.authorId,
          fullName: data.users.find((user) => user.id === item.authorId).fullName,
          role: data.users.find((user) => user.id === item.authorId).role
        }
      : null
  }));
}

export function assignExpertToCase(data, problemCase, expertId, actorId) {
  const previousExpertId = problemCase.expertId ?? "";
  const nextExpertId = String(expertId ?? "").trim();
  const now = nowIso();
  const nextCase = {
    ...problemCase,
    expertId: nextExpertId,
    updatedAt: now,
    timeline: [
      ...(problemCase.timeline ?? []),
      {
        id: createId("event"),
        at: now,
        title: "Expert assignment changed",
        description: nextExpertId ? "Case assigned to expert." : "Expert assignment removed."
      }
    ]
  };

  appendAuditLog(data, {
    actorId,
    caseId: problemCase.id,
    entityType: "case",
    entityId: problemCase.id,
    action: "case.expert_assigned",
    title: "Case expert assignment changed",
    details: { previousExpertId, expertId: nextExpertId }
  });

  return nextCase;
}
