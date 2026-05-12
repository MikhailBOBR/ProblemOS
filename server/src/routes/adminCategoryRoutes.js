import { updateCategoryPlaybook } from "../services/playbookService.js";
import { requireAdmin, requireUser } from "../http/requestContext.js";
import { matchPath } from "../http/routing.js";
import { createRepositories } from "../repositories/index.js";
import { parseAdminCategoryRequest } from "../dto/requestDtos.js";
import { presentItem, presentList } from "../presenters/responsePresenters.js";
import { createHttpError, sendJson } from "../utils/http.js";

export async function handleAdminCategoryRoutes(req, res, store, { pathname, method }) {
  if (method === "GET" && pathname === "/api/admin/categories") {
    const { data, user } = await requireUser(req, store);
    requireAdmin(user);
    sendJson(res, 200, presentList(createRepositories(data).categories.list()));
    return true;
  }

  const adminCategoryParams = matchPath(pathname, "/api/admin/categories/:id");
  if (adminCategoryParams && method === "PATCH") {
    const { user } = await requireUser(req, store);
    requireAdmin(user);
    const body = await parseAdminCategoryRequest(req);
    const result = await store.mutate((data) => {
      const category = createRepositories(data).categories.findById(adminCategoryParams.id);
      if (!category) {
        throw createHttpError(404, "Category not found");
      }
      return presentItem(updateCategoryPlaybook(data, category, body, user.id));
    });
    sendJson(res, 200, result);
    return true;
  }

  return false;
}
