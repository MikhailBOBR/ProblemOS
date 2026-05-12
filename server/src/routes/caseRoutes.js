import { createCaseComment, getCaseComments } from "../services/commentService.js";
import { evaluateCaseCompleteness } from "../services/completenessService.js";
import { appendAuditLog, getAuditLogsForCase } from "../services/auditLogService.js";
import { createNotification } from "../services/notificationService.js";
import { createCaseFromInput, enrichCase, updateCaseWithInput } from "../services/caseService.js";
import { createExpertRecommendation, getCaseRecommendations } from "../services/expertService.js";
import { performCaseAction } from "../services/workflowService.js";
import { assertCaseEdit, assertCaseReview, assertRole, canAccessCase, ROLES } from "../services/rbacService.js";
import { getCaseForUser, requireUser } from "../http/requestContext.js";
import { filterCases, matchPath, replaceCase } from "../http/routing.js";
import { createRepositories } from "../repositories/index.js";
import {
  parseCaseCreateRequest,
  parseCaseUpdateRequest,
  parseCommentRequest,
  parseRecommendationRequest,
  parseWorkflowActionRequest
} from "../dto/requestDtos.js";
import { sendJson } from "../utils/http.js";

export async function handleCaseRoutes(req, res, store, { pathname, method, url }) {
  if (method === "GET" && pathname === "/api/cases") {
    const { data, user } = await requireUser(req, store);
    const visibleCases = data.cases.filter((item) => canAccessCase(user, item));
    const items = filterCases(visibleCases, url)
      .map((item) => enrichCase(item, data, user))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    sendJson(res, 200, { items, total: items.length });
    return true;
  }

  if (method === "GET" && pathname === "/api/expert/cases") {
    const { data, user } = await requireUser(req, store);
    assertRole(user, [ROLES.ADMIN, ROLES.EXPERT], "Expert role required");
    const visibleCases = user.role === ROLES.ADMIN ? data.cases : data.cases.filter((item) => item.expertId === user.id);
    const items = filterCases(visibleCases, url)
      .map((item) => enrichCase(item, data, user))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    sendJson(res, 200, { items, total: items.length });
    return true;
  }

  if (method === "POST" && pathname === "/api/cases") {
    const { user } = await requireUser(req, store);
    const body = await parseCaseCreateRequest(req);

    const result = await store.mutate((data) => {
      const repos = createRepositories(data);
      const { problemCase, analysis } = createCaseFromInput(user.id, body, data.categories);
      repos.cases.create(problemCase);
      repos.notifications.create(
        createNotification({
          userId: user.id,
          caseId: problemCase.id,
          type: "next_action",
          title: "Дело создано",
          message: problemCase.nextAction
        })
      );
      appendAuditLog(data, {
        actorId: user.id,
        caseId: problemCase.id,
        entityType: "case",
        entityId: problemCase.id,
        action: "case.created",
        title: "Дело создано",
        details: { categoryId: problemCase.categoryId, source: "web" }
      });
      return { item: enrichCase(problemCase, data, user), analysis };
    });

    sendJson(res, 201, result);
    return true;
  }

  const caseParams = matchPath(pathname, "/api/cases/:id");
  if (caseParams && method === "GET") {
    const { data, user } = await requireUser(req, store);
    const problemCase = getCaseForUser(data, user, caseParams.id);
    sendJson(res, 200, { item: enrichCase(problemCase, data, user) });
    return true;
  }

  const auditParams = matchPath(pathname, "/api/cases/:id/audit");
  if (auditParams && method === "GET") {
    const { data, user } = await requireUser(req, store);
    getCaseForUser(data, user, auditParams.id);
    sendJson(res, 200, { items: getAuditLogsForCase(data, auditParams.id) });
    return true;
  }

  const recommendationParams = matchPath(pathname, "/api/cases/:id/recommendations");
  if (recommendationParams && method === "GET") {
    const { data, user } = await requireUser(req, store);
    const problemCase = getCaseForUser(data, user, recommendationParams.id);
    sendJson(res, 200, { items: getCaseRecommendations(data, problemCase, user) });
    return true;
  }

  if (recommendationParams && method === "POST") {
    const { user } = await requireUser(req, store);
    const body = await parseRecommendationRequest(req);

    const result = await store.mutate((data) => {
      const repos = createRepositories(data);
      const problemCase = getCaseForUser(data, user, recommendationParams.id);
      assertCaseReview(user, problemCase, "Expert review access denied");
      const recommendation = createExpertRecommendation({
        caseId: problemCase.id,
        authorId: user.id,
        text: body.text,
        visibility: body.visibility,
        status: body.status
      });
      repos.recommendations.create(recommendation);
      if (recommendation.visibility === "user") {
        repos.notifications.create(
          createNotification({
            userId: problemCase.userId,
            caseId: problemCase.id,
            type: "expert_recommendation",
            title: "Expert recommendation",
            message: recommendation.text
          })
        );
      }
      appendAuditLog(data, {
        actorId: user.id,
        caseId: problemCase.id,
        entityType: "expert_recommendation",
        entityId: recommendation.id,
        action: "recommendation.created",
        title: "Expert recommendation created",
        details: { visibility: recommendation.visibility, status: recommendation.status }
      });
      return { item: getCaseRecommendations(data, problemCase, user).find((item) => item.id === recommendation.id) };
    });

    sendJson(res, 201, result);
    return true;
  }

  if (caseParams && method === "PATCH") {
    const { user } = await requireUser(req, store);
    const body = await parseCaseUpdateRequest(req);

    const result = await store.mutate((data) => {
      const problemCase = getCaseForUser(data, user, caseParams.id);
      assertCaseEdit(user, problemCase, "Case edit denied");
      const nextCase = updateCaseWithInput(problemCase, body);
      replaceCase(data, nextCase);
      appendAuditLog(data, {
        actorId: user.id,
        caseId: nextCase.id,
        entityType: "case",
        entityId: nextCase.id,
        action: "case.updated",
        title: "Дело обновлено",
        details: { changedFields: Object.keys(body) }
      });
      return { item: enrichCase(nextCase, data, user) };
    });

    sendJson(res, 200, result);
    return true;
  }

  const actionParams = matchPath(pathname, "/api/cases/:id/actions");
  if (actionParams && method === "POST") {
    const { user } = await requireUser(req, store);
    const body = await parseWorkflowActionRequest(req);

    const result = await store.mutate((data) => {
      const repos = createRepositories(data);
      const problemCase = getCaseForUser(data, user, actionParams.id);
      assertCaseEdit(user, problemCase, "Case action denied");
      const nextCase = performCaseAction(problemCase, String(body.action ?? ""), body);
      replaceCase(data, nextCase);
      repos.notifications.create(
        createNotification({
          userId: nextCase.userId,
          caseId: nextCase.id,
          type: "workflow",
          title: "Дело обновлено",
          message: nextCase.nextAction
        })
      );
      appendAuditLog(data, {
        actorId: user.id,
        caseId: nextCase.id,
        entityType: "case",
        entityId: nextCase.id,
        action: `workflow.${body.action}`,
        title: "Workflow-действие выполнено",
        details: { action: body.action, status: nextCase.status }
      });
      return { item: enrichCase(nextCase, data, user) };
    });

    sendJson(res, 200, result);
    return true;
  }

  const completenessParams = matchPath(pathname, "/api/cases/:id/completeness");
  if (completenessParams && method === "GET") {
    const { data, user } = await requireUser(req, store);
    const problemCase = getCaseForUser(data, user, completenessParams.id);
    sendJson(res, 200, { item: evaluateCaseCompleteness(problemCase, data.documentTemplates ?? []) });
    return true;
  }

  const commentsParams = matchPath(pathname, "/api/cases/:id/comments");
  if (commentsParams && method === "GET") {
    const { data, user } = await requireUser(req, store);
    getCaseForUser(data, user, commentsParams.id);
    sendJson(res, 200, { items: getCaseComments(data, commentsParams.id) });
    return true;
  }

  if (commentsParams && method === "POST") {
    const { user } = await requireUser(req, store);
    const body = await parseCommentRequest(req);

    const result = await store.mutate((data) => {
      const repos = createRepositories(data);
      const problemCase = getCaseForUser(data, user, commentsParams.id);
      const comment = createCaseComment({ caseId: problemCase.id, authorId: user.id, text: body.text });
      repos.comments.create(comment);
      appendAuditLog(data, {
        actorId: user.id,
        caseId: problemCase.id,
        entityType: "case_comment",
        entityId: comment.id,
        action: "comment.created",
        title: "Комментарий добавлен",
        details: { length: body.text.length }
      });
      return { item: getCaseComments(data, problemCase.id).find((item) => item.id === comment.id) };
    });

    sendJson(res, 201, result);
    return true;
  }

  return false;
}
