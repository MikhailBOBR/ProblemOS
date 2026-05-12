import { appendAuditLog } from "../services/auditLogService.js";
import { sanitizeRole } from "../services/rbacService.js";
import { requireAdmin, requireUser } from "../http/requestContext.js";
import { matchPath } from "../http/routing.js";
import { createRepositories } from "../repositories/index.js";
import { parseAdminRoleRequest } from "../dto/requestDtos.js";
import { sanitizeUser } from "../utils/security.js";
import { createHttpError, sendJson } from "../utils/http.js";

export async function handleAdminUserRoutes(req, res, store, { pathname, method }) {
  if (method === "GET" && pathname === "/api/admin/users") {
    const { data, user } = await requireUser(req, store);
    requireAdmin(user);
    const repos = createRepositories(data);
    const caseCounts = new Map();
    for (const problemCase of repos.cases.list()) {
      caseCounts.set(problemCase.userId, (caseCounts.get(problemCase.userId) ?? 0) + 1);
    }
    sendJson(res, 200, {
      items: repos.users.list().map((item) => ({
        ...sanitizeUser(item),
        casesCount: caseCounts.get(item.id) ?? 0,
        telegramLinked: Boolean(item.telegramId)
      }))
    });
    return true;
  }

  const adminUserRoleParams = matchPath(pathname, "/api/admin/users/:id/role");
  if (adminUserRoleParams && method === "PATCH") {
    const { user } = await requireUser(req, store);
    requireAdmin(user);
    const body = await parseAdminRoleRequest(req);
    const nextRole = sanitizeRole(body.role);

    const result = await store.mutate((data) => {
      const repos = createRepositories(data);
      const targetUser = repos.users.findById(adminUserRoleParams.id);
      if (!targetUser) {
        throw createHttpError(404, "User not found");
      }
      targetUser.role = nextRole;
      targetUser.updatedAt = new Date().toISOString();
      repos.users.replace(targetUser);
      appendAuditLog(data, {
        actorId: user.id,
        entityType: "user",
        entityId: targetUser.id,
        action: "user.role_updated",
        title: "User role updated",
        details: { role: nextRole }
      });
      return { item: sanitizeUser(targetUser) };
    });

    sendJson(res, 200, result);
    return true;
  }

  return false;
}
