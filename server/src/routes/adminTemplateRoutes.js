import { getTemplateVersions, restoreTemplateVersion, updateTemplateFromInput } from "../services/templateVersionService.js";
import { requireAdmin, requireUser } from "../http/requestContext.js";
import { matchPath } from "../http/routing.js";
import { createRepositories } from "../repositories/index.js";
import { parseAdminTemplateRequest, parseTemplateRestoreRequest } from "../dto/requestDtos.js";
import { presentItem, presentList } from "../presenters/responsePresenters.js";
import { createHttpError, sendJson } from "../utils/http.js";

export async function handleAdminTemplateRoutes(req, res, store, { pathname, method }) {
  if (method === "GET" && pathname === "/api/admin/templates") {
    const { data, user } = await requireUser(req, store);
    requireAdmin(user);
    const repos = createRepositories(data);
    sendJson(res, 200, presentList(repos.documentTemplates.list(), { categories: repos.categories.list() }));
    return true;
  }

  const templateVersionsParams = matchPath(pathname, "/api/admin/templates/:id/versions");
  if (templateVersionsParams && method === "GET") {
    const { data, user } = await requireUser(req, store);
    requireAdmin(user);
    const template = createRepositories(data).documentTemplates.findById(templateVersionsParams.id);
    if (!template) {
      throw createHttpError(404, "Template not found");
    }
    sendJson(res, 200, presentList(getTemplateVersions(data, template.id), { template }));
    return true;
  }

  const templateRestoreParams = matchPath(pathname, "/api/admin/templates/:id/restore");
  if (templateRestoreParams && method === "POST") {
    const { user } = await requireUser(req, store);
    requireAdmin(user);
    const body = await parseTemplateRestoreRequest(req);
    const result = await store.mutate((data) => {
      const template = createRepositories(data).documentTemplates.findById(templateRestoreParams.id);
      if (!template) {
        throw createHttpError(404, "Template not found");
      }
      const version = getTemplateVersions(data, template.id).find((item) => item.id === body.versionId);
      if (!version) {
        throw createHttpError(404, "Template version not found");
      }
      return presentItem(restoreTemplateVersion(data, template, version, user.id), { versions: getTemplateVersions(data, template.id) });
    });
    sendJson(res, 200, result);
    return true;
  }

  const templateParams = matchPath(pathname, "/api/admin/templates/:id");
  if (templateParams && method === "PATCH") {
    const { user } = await requireUser(req, store);
    requireAdmin(user);
    const body = await parseAdminTemplateRequest(req);

    const result = await store.mutate((data) => {
      const template = createRepositories(data).documentTemplates.findById(templateParams.id);
      if (!template) {
        throw createHttpError(404, "Шаблон не найден");
      }
      return presentItem(updateTemplateFromInput(data, template, body, user.id), { versions: getTemplateVersions(data, template.id) });
    });

    sendJson(res, 200, result);
    return true;
  }

  return false;
}
