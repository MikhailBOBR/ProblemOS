import { CASE_STATUS_META } from "../domain/statuses.js";
import { appendAuditLog } from "../services/auditLogService.js";
import { buildPostgresMigrationSql } from "../services/postgresMigrationService.js";
import { runDeadlineScheduler } from "../services/schedulerService.js";
import { dispatchTelegramNotifications } from "../services/telegramDeliveryService.js";
import { requireAdmin, requireUser } from "../http/requestContext.js";
import { readJson, sendJson, sendText } from "../utils/http.js";

export async function handleAdminOpsRoutes(req, res, store, { pathname, method, backupRoot }) {
  if (method === "GET" && pathname === "/api/admin/stats") {
    const { data, user } = await requireUser(req, store);
    requireAdmin(user);

    const byStatus = Object.fromEntries(CASE_STATUS_META.map((status) => [status.id, 0]));
    for (const item of data.cases) {
      byStatus[item.status] = (byStatus[item.status] ?? 0) + 1;
    }

    sendJson(res, 200, {
      users: data.users.length,
      cases: data.cases.length,
      documents: data.generatedDocuments.length,
      evidence: data.cases.reduce((sum, item) => sum + (item.evidence?.length ?? 0), 0),
      auditLogs: data.auditLogs.length,
      byStatus
    });
    return true;
  }

  if (method === "POST" && pathname === "/api/admin/scheduler/run") {
    const { user } = await requireUser(req, store);
    requireAdmin(user);
    const result = await store.mutate((data) => runDeadlineScheduler(data, { actorId: user.id }));
    sendJson(res, 200, result);
    return true;
  }

  if (method === "POST" && pathname === "/api/admin/notifications/dispatch") {
    const { user } = await requireUser(req, store);
    requireAdmin(user);
    const body = await readJson(req);
    const result = await store.mutate((data) =>
      dispatchTelegramNotifications(data, {
        actorId: user.id,
        dryRun: body.dryRun !== false,
        token: body.token || process.env.TELEGRAM_BOT_TOKEN
      })
    );
    sendJson(res, 200, result);
    return true;
  }

  if (method === "GET" && pathname === "/api/admin/export") {
    const { user } = await requireUser(req, store);
    requireAdmin(user);
    const content = await store.exportJson();
    sendText(res, 200, content, {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="problemos-export-${new Date().toISOString().slice(0, 10)}.json"`
    });
    return true;
  }

  if (method === "POST" && pathname === "/api/admin/backup") {
    const { user } = await requireUser(req, store);
    requireAdmin(user);
    const backupFile = await store.backup(backupRoot);
    await store.mutate((data) => {
      appendAuditLog(data, {
        actorId: user.id,
        entityType: "backup",
        action: "backup.created",
        title: "Backup создан",
        details: { backupFile }
      });
      return null;
    });
    sendJson(res, 201, { backupFile });
    return true;
  }

  if (method === "GET" && pathname === "/api/admin/audit") {
    const { data, user } = await requireUser(req, store);
    requireAdmin(user);
    sendJson(res, 200, {
      items: [...data.auditLogs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 200)
    });
    return true;
  }

  if (method === "GET" && (pathname === "/api/admin/migration/postgres" || pathname === "/api/admin/migrations/postgres")) {
    const { user } = await requireUser(req, store);
    requireAdmin(user);
    sendText(res, 200, buildPostgresMigrationSql(), { "Content-Type": "text/plain; charset=utf-8" });
    return true;
  }

  return false;
}
