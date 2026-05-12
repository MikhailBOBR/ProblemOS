import { appendAuditLog } from "./auditLogService.js";
import { createId, nowIso } from "../utils/id.js";

export function snapshotTemplateVersion(data, template, actorId, reason = "manual_update") {
  const now = nowIso();
  const version = {
    id: createId("template_version"),
    templateId: template.id,
    version: Number(template.version ?? 1),
    title: template.title,
    body: template.body,
    variables: [...(template.variables ?? [])],
    isActive: Boolean(template.isActive),
    categoryId: template.categoryId,
    type: template.type,
    reason,
    createdAt: now,
    createdBy: actorId
  };

  data.documentTemplateVersions.push(version);
  return version;
}

export function getTemplateVersions(data, templateId) {
  return (data.documentTemplateVersions ?? [])
    .filter((item) => item.templateId === templateId)
    .sort((a, b) => Number(b.version) - Number(a.version) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function updateTemplateFromInput(data, template, input, actorId) {
  snapshotTemplateVersion(data, template, actorId, "manual_update");

  if (input.title !== undefined) template.title = String(input.title).trim() || template.title;
  if (input.body !== undefined) template.body = String(input.body);
  if (input.isActive !== undefined) template.isActive = Boolean(input.isActive);
  if (input.variables !== undefined) {
    template.variables = Array.isArray(input.variables)
      ? input.variables.map((item) => String(item).trim()).filter(Boolean)
      : String(input.variables)
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);
  }

  template.version = Number(template.version ?? 1) + 1;
  template.updatedAt = nowIso();
  template.updatedBy = actorId;

  appendAuditLog(data, {
    actorId,
    entityType: "document_template",
    entityId: template.id,
    action: "template.updated",
    title: "Document template updated",
    details: { title: template.title, version: template.version, isActive: template.isActive }
  });

  return template;
}

export function restoreTemplateVersion(data, template, version, actorId) {
  snapshotTemplateVersion(data, template, actorId, "restore_before_change");

  template.title = version.title;
  template.body = version.body;
  template.variables = [...(version.variables ?? [])];
  template.isActive = Boolean(version.isActive);
  template.version = Number(template.version ?? 1) + 1;
  template.updatedAt = nowIso();
  template.updatedBy = actorId;

  appendAuditLog(data, {
    actorId,
    entityType: "document_template",
    entityId: template.id,
    action: "template.version_restored",
    title: "Document template version restored",
    details: { restoredVersionId: version.id, restoredVersion: version.version, nextVersion: template.version }
  });

  return template;
}
