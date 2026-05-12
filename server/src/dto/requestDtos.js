import {
  optionalArray,
  optionalBoolean,
  optionalNumber,
  optionalObject,
  optionalString,
  optionalStringArray,
  readJsonObject,
  requireString
} from "../http/validation.js";

export async function parseRegisterRequest(req) {
  const body = await readJsonObject(req);
  return {
    email: requireString(body, "email", { max: 320 }).toLowerCase(),
    password: requireString(body, "password", { min: 6, max: 256 }),
    fullName: optionalString(body, "fullName", { max: 160 }) ?? ""
  };
}

export async function parseLoginRequest(req) {
  const body = await readJsonObject(req);
  return {
    email: requireString(body, "email", { max: 320 }).toLowerCase(),
    password: requireString(body, "password", { min: 1, max: 256 })
  };
}

export async function parseProfileRequest(req) {
  const body = await readJsonObject(req);
  return {
    fullName: optionalString(body, "fullName", { max: 160 }),
    phone: optionalString(body, "phone", { max: 64 }),
    telegramId: optionalString(body, "telegramId", { max: 64 })
  };
}

export async function parseTextRequest(req, field = "text") {
  const body = await readJsonObject(req);
  return { [field]: requireString(body, field, { min: 1, max: 8000 }) };
}

export async function parseCaseCreateRequest(req) {
  const body = await readJsonObject(req);
  return {
    title: optionalString(body, "title", { max: 160 }),
    description: optionalString(body, "description", { max: 8000 }) ?? "",
    categoryId: optionalString(body, "categoryId", { max: 80 }),
    priority: optionalString(body, "priority", { max: 40 }),
    facts: optionalObject(body, "facts") ?? {}
  };
}

export async function parseCaseUpdateRequest(req) {
  const body = await readJsonObject(req);
  return stripUndefined({
    title: optionalString(body, "title", { max: 160 }),
    description: optionalString(body, "description", { max: 8000 }),
    facts: optionalObject(body, "facts"),
    status: optionalString(body, "status", { max: 80 }),
    priority: optionalString(body, "priority", { max: 40 }),
    result: optionalString(body, "result", { max: 4000 }),
    deadlineAt: optionalString(body, "deadlineAt", { max: 80 })
  });
}

export async function parseWorkflowActionRequest(req) {
  const body = await readJsonObject(req);
  return {
    ...body,
    action: requireString(body, "action", { max: 80 })
  };
}

export async function parseEvidenceUploadRequest(req) {
  const body = await readJsonObject(req);
  return stripUndefined({
    evidenceType: optionalString(body, "evidenceType", { max: 80 }),
    title: optionalString(body, "title", { max: 180 }),
    description: optionalString(body, "description", { max: 2000 }),
    fileName: optionalString(body, "fileName", { max: 240 }),
    fileType: optionalString(body, "fileType", { max: 120 }),
    fileSize: optionalNumber(body, "fileSize", { min: 0, max: 200 * 1024 * 1024 }),
    fileData: optionalString(body, "fileData", { max: 16 * 1024 * 1024 })
  });
}

export async function parseDocumentGenerateRequest(req) {
  const body = await readJsonObject(req);
  return { templateId: optionalString(body, "templateId", { max: 120 }) };
}

export async function parseCommentRequest(req) {
  const body = await readJsonObject(req);
  return { text: requireString(body, "text", { max: 4000 }) };
}

export async function parseRecommendationRequest(req) {
  const body = await readJsonObject(req);
  return {
    text: requireString(body, "text", { max: 4000 }),
    visibility: optionalString(body, "visibility", { max: 40 }),
    status: optionalString(body, "status", { max: 40 })
  };
}

export async function parseTelegramLinkRequest(req) {
  const body = await readJsonObject(req);
  return { telegramId: requireString(body, "telegramId", { max: 64 }) };
}

export async function parseAdminRoleRequest(req) {
  const body = await readJsonObject(req);
  return { role: requireString(body, "role", { max: 40 }) };
}

export async function parseAssignExpertRequest(req) {
  const body = await readJsonObject(req);
  return { expertId: optionalString(body, "expertId", { max: 120 }) ?? "" };
}

export async function parseAdminCategoryRequest(req) {
  const body = await readJsonObject(req);
  return stripUndefined({
    name: optionalString(body, "name", { max: 120 }),
    shortName: optionalString(body, "shortName", { max: 80 }),
    description: optionalString(body, "description", { max: 2000 }),
    defaultDeadlineDays: optionalNumber(body, "defaultDeadlineDays", { min: 1, max: 365 }),
    requiredEvidence: optionalArray(body, "requiredEvidence", { maxItems: 50 }),
    questions: optionalArray(body, "questions", { maxItems: 50 }),
    route: optionalStringArray(body, "route", { maxItems: 50 })
  });
}

export async function parseAdminTemplateRequest(req) {
  const body = await readJsonObject(req);
  return stripUndefined({
    title: optionalString(body, "title", { max: 180 }),
    body: optionalString(body, "body", { max: 40000 }),
    isActive: optionalBoolean(body, "isActive"),
    variables: body.variables === undefined ? undefined : Array.isArray(body.variables) ? optionalStringArray(body, "variables") : optionalString(body, "variables", { max: 4000 })
  });
}

export async function parseTemplateRestoreRequest(req) {
  const body = await readJsonObject(req);
  return { versionId: requireString(body, "versionId", { max: 120 }) };
}

function stripUndefined(value) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined));
}
