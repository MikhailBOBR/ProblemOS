import { enrichCase } from "../services/caseService.js";
import { assignExpertToCase } from "../services/expertService.js";
import { ROLES } from "../services/rbacService.js";
import { requireAdmin, requireUser } from "../http/requestContext.js";
import { filterCases, matchPath, replaceCase } from "../http/routing.js";
import { createRepositories } from "../repositories/index.js";
import { parseAssignExpertRequest } from "../dto/requestDtos.js";
import { presentItem, presentList } from "../presenters/responsePresenters.js";
import { sanitizeUser } from "../utils/security.js";
import { createHttpError, sendJson } from "../utils/http.js";

export async function handleAdminCaseRoutes(req, res, store, { pathname, method, url }) {
  if (method === "GET" && pathname === "/api/admin/cases") {
    const { data, user } = await requireUser(req, store);
    requireAdmin(user);
    const repos = createRepositories(data);
    const items = filterCases(repos.cases.list(), url)
      .map((item) => ({
        ...enrichCase(item, data, user),
        owner: sanitizeUser(repos.users.findById(item.userId))
      }))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    sendJson(res, 200, presentList(items));
    return true;
  }

  const assignExpertParams = matchPath(pathname, "/api/admin/cases/:id/assign-expert");
  if (assignExpertParams && method === "PATCH") {
    const { user } = await requireUser(req, store);
    requireAdmin(user);
    const body = await parseAssignExpertRequest(req);

    const result = await store.mutate((data) => {
      const repos = createRepositories(data);
      const problemCase = repos.cases.findById(assignExpertParams.id);
      if (!problemCase) {
        throw createHttpError(404, "Case not found");
      }
      const expertId = body.expertId;
      if (expertId) {
        const expert = repos.users.findById(expertId);
        if (!expert || expert.role !== ROLES.EXPERT) {
          throw createHttpError(400, "Selected user is not an expert");
        }
      }
      const nextCase = assignExpertToCase(data, problemCase, expertId, user.id);
      replaceCase(data, nextCase);
      return presentItem(enrichCase(nextCase, data, user));
    });

    sendJson(res, 200, result);
    return true;
  }

  return false;
}
