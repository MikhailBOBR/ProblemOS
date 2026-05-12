import { getCategory } from "../domain/categories.js";
import { CASE_STATUS } from "../domain/statuses.js";
import { createId, formatDateRu, nowIso } from "../utils/id.js";
import { buildNextAction } from "./nextActionService.js";

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function renderTemplate(templateBody, variables) {
  let output = templateBody;

  for (const [key, value] of Object.entries(variables)) {
    const pattern = new RegExp(`{{\\s*${escapeRegExp(key)}\\s*}}`, "g");
    output = output.replace(pattern, value || `[${key}]`);
  }

  return output.replace(/{{\s*([\w_]+)\s*}}/g, "[$1]");
}

export function buildTemplateVariables(problemCase, user) {
  const facts = problemCase.facts ?? {};
  return {
    full_name: user.fullName || user.email,
    case_title: problemCase.title,
    case_description: problemCase.description,
    today: formatDateRu(),
    ...facts
  };
}

export function generateDocument(problemCase, user, template) {
  const variables = buildTemplateVariables(problemCase, user);
  const content = renderTemplate(template.body, variables);
  const now = nowIso();

  return {
    id: createId("doc"),
    caseId: problemCase.id,
    templateId: template.id,
    title: template.title,
    content,
    variables,
    format: "rtf",
    createdAt: now
  };
}

export function attachGeneratedDocument(problemCase, document) {
  const now = nowIso();
  const next = {
    ...problemCase,
    status: CASE_STATUS.DOCUMENT_READY,
    documents: [...(problemCase.documents ?? []), document.id],
    updatedAt: now,
    timeline: [
      ...(problemCase.timeline ?? []),
      {
        id: createId("event"),
        at: now,
        title: "Документ подготовлен",
        description: document.title
      }
    ]
  };

  next.nextAction = buildNextAction(next);
  return next;
}

export function toRtf(document) {
  const escaped = document.content
    .replace(/\\/g, "\\\\")
    .replace(/{/g, "\\{")
    .replace(/}/g, "\\}")
    .replace(/\n/g, "\\par\n");

  return `{\\rtf1\\ansi\\deff0
{\\fonttbl{\\f0 Arial;}}
\\fs24 ${escaped}
\\par\\par
\\fs18 Сформировано в ProblemOS. Сервис помогает структурировать данные и документы, но не заменяет юридическую консультацию.
}`;
}

export function buildCasePackage(problemCase, data) {
  const category = getCategory(problemCase.categoryId);
  const documents = (problemCase.documents ?? [])
    .map((id) => data.generatedDocuments.find((document) => document.id === id))
    .filter(Boolean);

  return [
    `# Пакет дела: ${problemCase.title}`,
    "",
    `Категория: ${category.name}`,
    `Статус: ${problemCase.status}`,
    `Следующий шаг: ${problemCase.nextAction}`,
    `Дедлайн: ${problemCase.deadlineAt ? formatDateRu(problemCase.deadlineAt) : "не указан"}`,
    "",
    "## Описание",
    problemCase.description || "Описание не заполнено.",
    "",
    "## Факты",
    ...Object.entries(problemCase.facts ?? {}).map(([key, value]) => `- ${key}: ${value || "-"}`),
    "",
    "## Доказательства",
    ...(problemCase.evidence?.length
      ? problemCase.evidence.map((item) => {
          const fileState = item.hasFile ? `файл сохранен, sha256 ${String(item.fileHash || "").slice(0, 16)}...` : "только запись без файла";
          return `- ${item.title} (${item.fileName}) - ${item.description || "без описания"}; ${fileState}`;
        })
      : ["- Доказательства пока не загружены."]),
    "",
    "## Документы",
    ...(documents.length ? documents.map((item) => `- ${item.title}, ${formatDateRu(item.createdAt)}`) : ["- Документы пока не сформированы."]),
    "",
    "## Хронология",
    ...(problemCase.timeline?.length
      ? problemCase.timeline.map((event) => `- ${formatDateRu(event.at)}: ${event.title}. ${event.description}`)
      : ["- Событий пока нет."]),
    "",
    "_ProblemOS не гарантирует результат спора и не заменяет профессиональную юридическую консультацию._"
  ].join("\n");
}
