import { attachGeneratedDocument, buildCasePackage, generateDocument } from "../services/documentService.js";
import { buildCasePackageZip } from "../services/casePackageService.js";
import { enrichCase } from "../services/caseService.js";
import { exportDocument } from "../services/documentExportService.js";
import { appendAuditLog } from "../services/auditLogService.js";
import { assertCaseEdit } from "../services/rbacService.js";
import { getCaseForUser, requireUser } from "../http/requestContext.js";
import { getTemplatesForCategory, matchPath, replaceCase, sendBuffer } from "../http/routing.js";
import { createRepositories } from "../repositories/index.js";
import { parseDocumentGenerateRequest } from "../dto/requestDtos.js";
import { createHttpError, sendJson, sendText } from "../utils/http.js";

export async function handleDocumentRoutes(req, res, store, { pathname, method, url, uploadRoot }) {
  const caseDocumentsParams = matchPath(pathname, "/api/cases/:id/documents");
  if (caseDocumentsParams && method === "GET") {
    const { data, user } = await requireUser(req, store);
    const repos = createRepositories(data);
    const problemCase = getCaseForUser(data, user, caseDocumentsParams.id);
    const documents = repos.generatedDocuments.listByCaseDocumentIds(problemCase.documents);
    sendJson(res, 200, { items: documents, templates: getTemplatesForCategory(data, problemCase.categoryId) });
    return true;
  }

  const generateParams = matchPath(pathname, "/api/cases/:id/documents/generate");
  if (generateParams && method === "POST") {
    const { user } = await requireUser(req, store);
    const body = await parseDocumentGenerateRequest(req);

    const result = await store.mutate((data) => {
      const repos = createRepositories(data);
      const problemCase = getCaseForUser(data, user, generateParams.id);
      assertCaseEdit(user, problemCase, "Document generation denied");
      const templates = getTemplatesForCategory(data, problemCase.categoryId);
      const template = templates.find((item) => item.id === body.templateId) ?? templates[0];

      if (!template) {
        throw createHttpError(404, "Для категории нет активного шаблона");
      }

      const owner = repos.users.findById(problemCase.userId) ?? user;
      const document = generateDocument(problemCase, owner, template);
      repos.generatedDocuments.create(document);
      const nextCase = attachGeneratedDocument(problemCase, document);
      replaceCase(data, nextCase);
      appendAuditLog(data, {
        actorId: user.id,
        caseId: nextCase.id,
        entityType: "document",
        entityId: document.id,
        action: "document.generated",
        title: "Документ сформирован",
        details: { templateId: template.id, title: document.title }
      });
      return { item: document, case: enrichCase(nextCase, data, user) };
    });

    sendJson(res, 201, result);
    return true;
  }

  const packageParams = matchPath(pathname, "/api/cases/:id/package");
  if (packageParams && method === "GET") {
    const { data, user } = await requireUser(req, store);
    const problemCase = getCaseForUser(data, user, packageParams.id);
    const format = url.searchParams.get("format") || "md";

    if (format === "zip") {
      const archive = await buildCasePackageZip({ problemCase, data, uploadRoot });
      sendBuffer(res, 200, archive, {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(problemCase.title)}.zip"`
      });
      return true;
    }

    const content = buildCasePackage(problemCase, data);
    sendText(res, 200, content, {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(problemCase.title)}.md"`
    });
    return true;
  }

  const downloadParams = matchPath(pathname, "/api/documents/:id/download");
  if (downloadParams && method === "GET") {
    const { data, user } = await requireUser(req, store);
    const document = createRepositories(data).generatedDocuments.findById(downloadParams.id);
    if (!document) {
      throw createHttpError(404, "Документ не найден");
    }
    const problemCase = getCaseForUser(data, user, document.caseId);
    const exported = exportDocument(document, url.searchParams.get("format") || "rtf");
    const fileName = `${problemCase.title}-${exported.fileName}`.replace(/[\\/:*?"<>|]+/g, "-");
    sendBuffer(res, 200, exported.body, {
      "Content-Type": exported.contentType,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`
    });
    return true;
  }

  return false;
}
