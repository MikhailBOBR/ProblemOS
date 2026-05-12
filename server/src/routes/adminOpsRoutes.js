import { CASE_STATUS_META } from "../domain/statuses.js";
import { appendAuditLog } from "../services/auditLogService.js";
import { buildPostgresMigrationSql } from "../services/postgresMigrationService.js";
import { runDeadlineScheduler } from "../services/schedulerService.js";
import { dispatchTelegramNotifications } from "../services/telegramDeliveryService.js";
import { requireAdmin, requireUser } from "../http/requestContext.js";
import { createRepositories } from "../repositories/index.js";
import { optionalString, readJsonObject } from "../http/validation.js";
import { presentList } from "../presenters/responsePresenters.js";
import { sendJson, sendText } from "../utils/http.js";

export async function handleAdminOpsRoutes(req, res, store, { pathname, method, backupRoot }) {
  if (method === "GET" && pathname === "/api/admin/stats") {
    const { data, user } = await requireUser(req, store);
    requireAdmin(user);
    const repos = createRepositories(data);

    sendJson(res, 200, repos.metrics.platformCounts(CASE_STATUS_META.map((status) => status.id)));
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
    const body = await readJsonObject(req);
    const token = optionalString(body, "token", { max: 4096 });
    const result = await store.mutate((data) =>
      dispatchTelegramNotifications(data, {
        actorId: user.id,
        dryRun: body.dryRun !== false,
        token: token || process.env.TELEGRAM_BOT_TOKEN
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
    sendJson(res, 200, presentList(createRepositories(data).auditLogs.listRecent(200)));
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
