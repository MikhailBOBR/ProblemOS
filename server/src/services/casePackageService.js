import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { createZip } from "./archiveService.js";
import { buildCasePackage } from "./documentService.js";
import { toRtfBuffer } from "./documentExportService.js";
import { resolveEvidencePath, sanitizeFileName } from "./fileStorageService.js";

function safeName(value) {
  return sanitizeFileName(String(value || "file")).replace(/\s+/g, "-");
}

export async function buildCasePackageZip({ problemCase, data, uploadRoot }) {
  const documents = (problemCase.documents ?? [])
    .map((id) => data.generatedDocuments.find((document) => document.id === id))
    .filter(Boolean);
  const audit = (data.auditLogs ?? []).filter((entry) => entry.caseId === problemCase.id);
  const files = [
    { name: "case/summary.md", content: buildCasePackage(problemCase, data) },
    { name: "case/timeline.json", content: JSON.stringify(problemCase.timeline ?? [], null, 2) },
    { name: "case/audit-log.json", content: JSON.stringify(audit, null, 2) },
    { name: "case/evidence-index.json", content: JSON.stringify(problemCase.evidence ?? [], null, 2) },
    { name: "case/documents-index.json", content: JSON.stringify(documents, null, 2) }
  ];

  for (const document of documents) {
    files.push({
      name: `documents/${safeName(document.title)}-${document.id}.rtf`,
      content: toRtfBuffer(document)
    });
  }

  for (const evidence of problemCase.evidence ?? []) {
    if (!evidence.hasFile) {
      continue;
    }
    const sourcePath = resolveEvidencePath(uploadRoot, evidence);
    files.push({
      name: `evidence/${safeName(evidence.title)}-${basename(evidence.fileName || evidence.id)}`,
      content: await readFile(sourcePath)
    });
  }

  return createZip(files);
}
