import { buildAdminAnalytics, buildExpertWorkAnalytics, buildUserAnalytics } from "../services/analyticsService.js";
import { assertRole, ROLES } from "../services/rbacService.js";
import { requireAdmin, requireUser } from "../http/requestContext.js";
import { sendJson } from "../utils/http.js";

export async function handleAnalyticsRoutes(req, res, store, { pathname, method }) {
  if (method === "GET" && pathname === "/api/me/analytics") {
    const { data, user } = await requireUser(req, store);
    sendJson(res, 200, buildUserAnalytics(data, user));
    return true;
  }

  if (method === "GET" && pathname === "/api/expert/analytics") {
    const { data, user } = await requireUser(req, store);
    assertRole(user, [ROLES.ADMIN, ROLES.EXPERT], "Expert role required");
    sendJson(res, 200, buildExpertWorkAnalytics(data, user));
    return true;
  }

  if (method === "GET" && pathname === "/api/admin/analytics") {
    const { data, user } = await requireUser(req, store);
    requireAdmin(user);
    sendJson(res, 200, buildAdminAnalytics(data));
    return true;
  }

  return false;
}
