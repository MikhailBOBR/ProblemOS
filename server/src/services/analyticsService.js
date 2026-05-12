import { CASE_STATUS_META } from "../domain/statuses.js";

const CLOSED_STATUS = "closed";

function safeDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function percent(count, total) {
  return total ? Math.round((count / total) * 100) : 0;
}

function isActiveCase(problemCase) {
  return problemCase.status !== CLOSED_STATUS;
}

function isOverdue(problemCase, now = new Date()) {
  const deadline = safeDate(problemCase.deadlineAt);
  return Boolean(deadline && isActiveCase(problemCase) && deadline.getTime() < now.getTime());
}

function isWithinDays(value, days, now = new Date()) {
  const date = safeDate(value);
  if (!date) return false;
  const diff = date.getTime() - now.getTime();
  return diff >= 0 && diff <= days * 24 * 60 * 60 * 1000;
}

function countBy(items, keyFn) {
  const map = new Map();
  for (const item of items) {
    const key = keyFn(item);
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
}

function getCategory(data, categoryId) {
  return (data.categories ?? []).find((category) => category.id === categoryId) ?? {
    id: categoryId,
    name: categoryId,
    shortName: categoryId
  };
}

function getDocumentsForCases(data, cases) {
  const caseIds = new Set(cases.map((item) => item.id));
  return (data.generatedDocuments ?? []).filter((document) => caseIds.has(document.caseId));
}

function getRecommendationsForCases(data, cases) {
  const caseIds = new Set(cases.map((item) => item.id));
  return (data.expertRecommendations ?? []).filter((recommendation) => caseIds.has(recommendation.caseId));
}

function buildStatusBreakdown(cases) {
  const byStatus = countBy(cases, (item) => item.status);
  return CASE_STATUS_META.map((status) => ({
    id: status.id,
    label: status.label,
    tone: status.tone,
    count: byStatus.get(status.id) ?? 0,
    percent: percent(byStatus.get(status.id) ?? 0, cases.length)
  }));
}

function buildCategoryBreakdown(data, cases) {
  return (data.categories ?? []).map((category) => {
    const categoryCases = cases.filter((item) => item.categoryId === category.id);
    return {
      id: category.id,
      name: category.name,
      shortName: category.shortName,
      count: categoryCases.length,
      active: categoryCases.filter(isActiveCase).length,
      overdue: categoryCases.filter((item) => isOverdue(item)).length,
      documents: getDocumentsForCases(data, categoryCases).length,
      evidence: categoryCases.reduce((sum, item) => sum + (item.evidence?.length ?? 0), 0),
      percent: percent(categoryCases.length, cases.length)
    };
  });
}

function buildDeadlineAnalytics(data, cases) {
  const now = new Date();
  const upcoming = cases
    .filter((item) => isActiveCase(item) && isWithinDays(item.deadlineAt, 7, now))
    .sort((a, b) => safeDate(a.deadlineAt).getTime() - safeDate(b.deadlineAt).getTime())
    .slice(0, 8)
    .map((item) => ({
      caseId: item.id,
      title: item.title,
      status: item.status,
      deadlineAt: item.deadlineAt,
      category: getCategory(data, item.categoryId).name
    }));

  return {
    overdue: cases.filter((item) => isOverdue(item, now)).length,
    next7Days: upcoming.length,
    withoutDeadline: cases.filter((item) => isActiveCase(item) && !item.deadlineAt).length,
    upcoming
  };
}

function buildDocumentAnalytics(data, cases) {
  const documents = getDocumentsForCases(data, cases);
  const byTemplate = countBy(documents, (item) => item.templateId || "unknown");
  return {
    total: documents.length,
    byTemplate: [...byTemplate.entries()].map(([templateId, count]) => {
      const template = (data.documentTemplates ?? []).find((item) => item.id === templateId);
      return {
        templateId,
        title: template?.title ?? templateId,
        count,
        percent: percent(count, documents.length)
      };
    }),
    latest: [...documents]
      .sort((a, b) => (safeDate(b.createdAt)?.getTime() ?? 0) - (safeDate(a.createdAt)?.getTime() ?? 0))
      .slice(0, 5)
      .map((document) => ({
        id: document.id,
        title: document.title,
        caseId: document.caseId,
        createdAt: document.createdAt
      }))
  };
}

function buildEvidenceAnalytics(cases) {
  const evidence = cases.flatMap((problemCase) => problemCase.evidence ?? []);
  const byType = countBy(evidence, (item) => item.evidenceType || "unknown");
  return {
    total: evidence.length,
    averagePerCase: cases.length ? Number((evidence.length / cases.length).toFixed(2)) : 0,
    withFiles: evidence.filter((item) => item.hasFile).length,
    byType: [...byType.entries()].map(([type, count]) => ({ type, count, percent: percent(count, evidence.length) }))
  };
}

function buildThroughputAnalytics(cases) {
  const now = new Date();
  const createdLast7Days = cases.filter((item) => {
    const created = safeDate(item.createdAt);
    return created && now.getTime() - created.getTime() <= 7 * 24 * 60 * 60 * 1000;
  }).length;
  const createdLast30Days = cases.filter((item) => {
    const created = safeDate(item.createdAt);
    return created && now.getTime() - created.getTime() <= 30 * 24 * 60 * 60 * 1000;
  }).length;
  const closedLast30Days = cases.filter((item) => {
    const closed = safeDate(item.closedAt);
    return closed && now.getTime() - closed.getTime() <= 30 * 24 * 60 * 60 * 1000;
  }).length;
  const progressValues = cases.map((item) => {
    const total = item.steps?.length ?? 0;
    const done = (item.steps ?? []).filter((step) => step.status === "done").length;
    return total ? (done / total) * 100 : 0;
  });

  return {
    createdLast7Days,
    createdLast30Days,
    closedLast30Days,
    averageProgressPercent: progressValues.length
      ? Math.round(progressValues.reduce((sum, value) => sum + value, 0) / progressValues.length)
      : 0
  };
}

function buildNotificationAnalytics(data, userIds = null) {
  const allowedUserIds = userIds ? new Set(userIds) : null;
  const notifications = (data.notifications ?? []).filter((item) => !allowedUserIds || allowedUserIds.has(item.userId));
  return {
    total: notifications.length,
    unread: notifications.filter((item) => !item.isRead).length,
    telegramPending: notifications.filter((item) => item.channel === "telegram" && item.telegramStatus === "pending").length,
    telegramDelivered: notifications.filter((item) => item.channel === "telegram" && item.telegramStatus === "delivered").length,
    telegramFailed: notifications.filter((item) => item.channel === "telegram" && item.telegramStatus === "failed").length
  };
}

function buildExpertAnalytics(data, cases) {
  const experts = (data.users ?? []).filter((user) => user.role === "expert");
  const recommendations = getRecommendationsForCases(data, cases);
  return {
    totalExperts: experts.length,
    assignedCases: cases.filter((item) => item.expertId).length,
    unassignedCases: cases.filter((item) => !item.expertId).length,
    recommendations: recommendations.length,
    workload: experts
      .map((expert) => {
        const assigned = cases.filter((item) => item.expertId === expert.id);
        const expertRecommendations = recommendations.filter((item) => item.authorId === expert.id);
        return {
          expertId: expert.id,
          fullName: expert.fullName,
          email: expert.email,
          assignedCases: assigned.length,
          activeCases: assigned.filter(isActiveCase).length,
          overdueCases: assigned.filter((item) => isOverdue(item)).length,
          recommendations: expertRecommendations.length,
          internalRecommendations: expertRecommendations.filter((item) => item.visibility === "internal").length
        };
      })
      .sort((a, b) => b.assignedCases - a.assignedCases || b.recommendations - a.recommendations)
  };
}

function buildAnalytics({ data, cases, scope, user = null, includePlatform = false }) {
  const documents = getDocumentsForCases(data, cases);
  const recommendations = getRecommendationsForCases(data, cases);
  const userIds = [...new Set(cases.map((item) => item.userId))];

  return {
    generatedAt: new Date().toISOString(),
    scope,
    totals: {
      users: includePlatform ? data.users.length : scope === "user" ? 1 : userIds.length,
      cases: cases.length,
      activeCases: cases.filter(isActiveCase).length,
      closedCases: cases.filter((item) => item.status === CLOSED_STATUS).length,
      overdueCases: cases.filter((item) => isOverdue(item)).length,
      documents: documents.length,
      evidence: cases.reduce((sum, item) => sum + (item.evidence?.length ?? 0), 0),
      recommendations: recommendations.length,
      comments: (data.caseComments ?? []).filter((comment) => cases.some((item) => item.id === comment.caseId)).length
    },
    byStatus: buildStatusBreakdown(cases),
    byCategory: buildCategoryBreakdown(data, cases),
    deadlines: buildDeadlineAnalytics(data, cases),
    documents: buildDocumentAnalytics(data, cases),
    evidence: buildEvidenceAnalytics(cases),
    throughput: buildThroughputAnalytics(cases),
    notifications: buildNotificationAnalytics(data, includePlatform ? null : user ? [user.id] : userIds),
    experts: buildExpertAnalytics(data, cases)
  };
}

export function buildAdminAnalytics(data) {
  return buildAnalytics({ data, cases: data.cases ?? [], scope: "admin", includePlatform: true });
}

export function buildUserAnalytics(data, user) {
  const cases = (data.cases ?? []).filter((item) => item.userId === user.id);
  return buildAnalytics({ data, cases, scope: "user", user });
}

export function buildExpertWorkAnalytics(data, user) {
  const cases =
    user.role === "admin" ? data.cases ?? [] : (data.cases ?? []).filter((item) => item.expertId === user.id);
  return buildAnalytics({ data, cases, scope: user.role === "admin" ? "expert_admin" : "expert", user });
}
