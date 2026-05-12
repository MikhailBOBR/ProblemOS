import { appendAuditLog } from "../services/auditLogService.js";
import { runDeadlineScheduler } from "../services/schedulerService.js";
import { requireUser } from "../http/requestContext.js";
import { matchPath } from "../http/routing.js";
import { createRepositories } from "../repositories/index.js";
import { presentItem, presentList, presentUpdatedCount } from "../presenters/responsePresenters.js";
import { createHttpError, sendJson } from "../utils/http.js";

export async function handleNotificationRoutes(req, res, store, { pathname, method }) {
  if (method === "GET" && pathname === "/api/notifications") {
    const { user } = await requireUser(req, store);
    const result = await store.mutate((data) => {
      const repos = createRepositories(data);
      runDeadlineScheduler(data, { actorId: "system", userId: user.id });
      const items = repos.notifications
        .listForUser(user.id)
        .sort((a, b) => new Date(b.sendAt).getTime() - new Date(a.sendAt).getTime());
      return presentList(items, { unread: items.filter((item) => !item.isRead).length });
    });
    sendJson(res, 200, result);
    return true;
  }

  if (method === "PATCH" && pathname === "/api/notifications/read-all") {
    const { user } = await requireUser(req, store);
    const result = await store.mutate((data) => {
      const repos = createRepositories(data);
      const now = new Date().toISOString();
      let updated = 0;
      for (const notification of repos.notifications.listForUser(user.id)) {
        if (!notification.isRead) {
          notification.isRead = true;
          notification.readAt = now;
          updated += 1;
        }
      }
      appendAuditLog(data, {
        actorId: user.id,
        entityType: "notification",
        action: "notification.read_all",
        title: "Все уведомления отмечены прочитанными",
        details: { updated }
      });
      return presentUpdatedCount(updated);
    });
    sendJson(res, 200, result);
    return true;
  }

  const notificationParams = matchPath(pathname, "/api/notifications/:id/read");
  if (notificationParams && method === "PATCH") {
    const { user } = await requireUser(req, store);

    const result = await store.mutate((data) => {
      const repos = createRepositories(data);
      const notification = repos.notifications.findForUser(notificationParams.id, user.id);
      if (!notification) {
        throw createHttpError(404, "Уведомление не найдено");
      }
      notification.isRead = true;
      notification.readAt = new Date().toISOString();
      return presentItem(notification);
    });

    sendJson(res, 200, result);
    return true;
  }

  return false;
}
