import { addEvidenceToCase, enrichCase } from "../services/caseService.js";
import { appendAuditLog } from "../services/auditLogService.js";
import { openEvidenceFile, persistEvidenceFile, sanitizeFileName } from "../services/fileStorageService.js";
import { assertCaseEdit } from "../services/rbacService.js";
import { findEvidenceForUser, getCaseForUser, requireUser } from "../http/requestContext.js";
import { matchPath, replaceCase } from "../http/routing.js";
import { parseEvidenceUploadRequest } from "../dto/requestDtos.js";
import { presentItem } from "../presenters/responsePresenters.js";
import { createId } from "../utils/id.js";
import { sendJson } from "../utils/http.js";

export async function handleEvidenceRoutes(req, res, store, { pathname, method, uploadRoot }) {
  const evidenceParams = matchPath(pathname, "/api/cases/:id/evidence");
  if (evidenceParams && method === "POST") {
    const { user } = await requireUser(req, store);
    const body = await parseEvidenceUploadRequest(req);

    const result = await store.mutate(async (data) => {
      const problemCase = getCaseForUser(data, user, evidenceParams.id);
      assertCaseEdit(user, problemCase, "Evidence upload denied");
      const evidenceId = createId("evidence");
      const fileMeta = await persistEvidenceFile({
        uploadRoot,
        caseId: problemCase.id,
        evidenceId,
        fileName: body.fileName || body.title,
        fileType: body.fileType,
        fileData: body.fileData
      });
      const { next, evidence } = addEvidenceToCase(problemCase, { ...body, id: evidenceId }, fileMeta);
      replaceCase(data, next);
      appendAuditLog(data, {
        actorId: user.id,
        caseId: next.id,
        entityType: "evidence",
        entityId: evidence.id,
        action: "evidence.uploaded",
        title: "Доказательство загружено",
        details: { evidenceType: evidence.evidenceType, hasFile: evidence.hasFile, fileHash: evidence.fileHash }
      });
      return presentItem(evidence, { case: enrichCase(next, data, user) });
    });

    sendJson(res, 201, result);
    return true;
  }

  const evidenceDownloadParams = matchPath(pathname, "/api/evidence/:id/download");
  if (evidenceDownloadParams && method === "GET") {
    const { data, user } = await requireUser(req, store);
    const { evidence } = findEvidenceForUser(data, user, evidenceDownloadParams.id);
    const file = await openEvidenceFile(uploadRoot, evidence);
    res.writeHead(200, {
      "Content-Type": file.fileType,
      "Content-Length": file.size,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(sanitizeFileName(file.fileName))}"`
    });
    file.stream.pipe(res);
    return true;
  }

  return false;
}
