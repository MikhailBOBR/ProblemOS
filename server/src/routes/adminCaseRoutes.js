import { enrichCase } from "../services/caseService.js";
import { assignExpertToCase } from "../services/expertService.js";
import { ROLES } from "../services/rbacService.js";
import { requireAdmin, requireUser } from "../http/requestContext.js";
import { filterCases, matchPath, replaceCase } from "../http/routing.js";
import { sanitizeUser } from "../utils/security.js";
import { createHttpError, readJson, sendJson } from "../utils/http.js";

export async function handleAdminCaseRoutes(req, res, store, { pathname, method, url }) {
  if (method === "GET" && pathname === "/api/admin/cases") {
    const { data, user } = await requireUser(req, store);
    requireAdmin(user);
    const items = filterCases(data.cases, url)
      .map((item) => ({
        ...enrichCase(item, data, user),
        owner: sanitizeUser(data.users.find((candidate) => candidate.id === item.userId))
      }))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    sendJson(res, 200, { items, total: items.length });
    return true;
  }

  const assignExpertParams = matchPath(pathname, "/api/admin/cases/:id/assign-expert");
  if (assignExpertParams && method === "PATCH") {
    const { user } = await requireUser(req, store);
    requireAdmin(user);
    const body = await readJson(req);

    const result = await store.mutate((data) => {
      const problemCase = data.cases.find((item) => item.id === assignExpertParams.id);
      if (!problemCase) {
        throw createHttpError(404, "Case not found");
      }
      const expertId = String(body.expertId ?? "").trim();
      if (expertId) {
        const expert = data.users.find((item) => item.id === expertId);
        if (!expert || expert.role !== ROLES.EXPERT) {
          throw createHttpError(400, "Selected user is not an expert");
        }
      }
      const nextCase = assignExpertToCase(data, problemCase, expertId, user.id);
      replaceCase(data, nextCase);
      return { item: enrichCase(nextCase, data, user) };
    });

    sendJson(res, 200, result);
    return true;
  }

  return false;
}
