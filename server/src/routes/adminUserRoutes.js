import { appendAuditLog } from "../services/auditLogService.js";
import { sanitizeRole } from "../services/rbacService.js";
import { requireAdmin, requireUser } from "../http/requestContext.js";
import { matchPath } from "../http/routing.js";
import { sanitizeUser } from "../utils/security.js";
import { createHttpError, readJson, sendJson } from "../utils/http.js";

export async function handleAdminUserRoutes(req, res, store, { pathname, method }) {
  if (method === "GET" && pathname === "/api/admin/users") {
    const { data, user } = await requireUser(req, store);
    requireAdmin(user);
    const caseCounts = new Map();
    for (const problemCase of data.cases) {
      caseCounts.set(problemCase.userId, (caseCounts.get(problemCase.userId) ?? 0) + 1);
    }
    sendJson(res, 200, {
      items: data.users.map((item) => ({
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
    const body = await readJson(req);
    const nextRole = sanitizeRole(String(body.role ?? ""));

    const result = await store.mutate((data) => {
      const targetUser = data.users.find((item) => item.id === adminUserRoleParams.id);
      if (!targetUser) {
        throw createHttpError(404, "User not found");
      }
      targetUser.role = nextRole;
      targetUser.updatedAt = new Date().toISOString();
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
