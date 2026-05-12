import { updateCategoryPlaybook } from "../services/playbookService.js";
import { requireAdmin, requireUser } from "../http/requestContext.js";
import { matchPath } from "../http/routing.js";
import { createHttpError, readJson, sendJson } from "../utils/http.js";

export async function handleAdminCategoryRoutes(req, res, store, { pathname, method }) {
  if (method === "GET" && pathname === "/api/admin/categories") {
    const { data, user } = await requireUser(req, store);
    requireAdmin(user);
    sendJson(res, 200, { items: data.categories });
    return true;
  }

  const adminCategoryParams = matchPath(pathname, "/api/admin/categories/:id");
  if (adminCategoryParams && method === "PATCH") {
    const { user } = await requireUser(req, store);
    requireAdmin(user);
    const body = await readJson(req);
    const result = await store.mutate((data) => {
      const category = data.categories.find((item) => item.id === adminCategoryParams.id);
      if (!category) {
        throw createHttpError(404, "Category not found");
      }
      return { item: updateCategoryPlaybook(data, category, body, user.id) };
    });
    sendJson(res, 200, result);
    return true;
  }

  return false;
}
