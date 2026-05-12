import { getCategory } from "../domain/categories.js";
import { CASE_STATUS, STEP_STATUS } from "../domain/statuses.js";
import { addDaysIso, createId, nowIso } from "../utils/id.js";
import { analyzeProblem } from "./aiService.js";
import { buildNextAction } from "./nextActionService.js";

function createSteps(category) {
  return category.route.map((title, index) => ({
    id: createId("step"),
    title,
    description: "",
    status: index === 0 ? STEP_STATUS.ACTIVE : STEP_STATUS.TODO,
    order: index + 1,
    deadlineAt: null,
    completedAt: null
  }));
}

function makeTitle(description, category) {
  const normalized = description.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return `Новое дело: ${category.shortName}`;
  }

  return normalized.length > 48 ? `${normalized.slice(0, 48)}...` : normalized;
}

export function createCaseFromInput(userId, input) {
  const analysis = analyzeProblem(input.description ?? "");
  const category = getCategory(input.categoryId || analysis.categoryId);
  const facts = {
    ...analysis.facts,
    ...(input.facts ?? {})
  };
  const now = nowIso();

  const problemCase = {
    id: createId("case"),
    userId,
    title: input.title?.trim() || makeTitle(input.description ?? "", category),
    categoryId: category.id,
    description: input.description?.trim() || "",
    facts,
    status: CASE_STATUS.FACT_COLLECTION,
    priority: input.priority || analysis.urgency || "normal",
    nextAction: "",
    deadlineAt: addDaysIso(category.defaultDeadlineDays),
    result: "",
    createdAt: now,
    updatedAt: now,
    closedAt: null,
    steps: createSteps(category),
    evidence: [],
    documents: [],
    timeline: [
      {
        id: createId("event"),
        at: now,
        title: "Дело создано",
        description: `Категория: ${category.name}. Цель: ${analysis.goal}.`
      }
    ]
  };

  problemCase.nextAction = buildNextAction(problemCase);
  return { problemCase, analysis };
}

export function enrichCase(problemCase, data) {
  const category = getCategory(problemCase.categoryId);
  return {
    ...problemCase,
    category,
    progress: {
      done: problemCase.steps.filter((step) => step.status === STEP_STATUS.DONE).length,
      total: problemCase.steps.length,
      percent: problemCase.steps.length
        ? Math.round((problemCase.steps.filter((step) => step.status === STEP_STATUS.DONE).length / problemCase.steps.length) * 100)
        : 0
    },
    documents: (problemCase.documents ?? [])
      .map((documentId) => data.generatedDocuments.find((document) => document.id === documentId))
      .filter(Boolean)
  };
}

export function updateCaseWithInput(problemCase, input) {
  const now = nowIso();
  const next = {
    ...problemCase,
    title: input.title ?? problemCase.title,
    description: input.description ?? problemCase.description,
    facts: {
      ...(problemCase.facts ?? {}),
      ...(input.facts ?? {})
    },
    status: input.status ?? problemCase.status,
    priority: input.priority ?? problemCase.priority,
    result: input.result ?? problemCase.result,
    deadlineAt: input.deadlineAt ?? problemCase.deadlineAt,
    updatedAt: now
  };

  if (input.status && input.status !== problemCase.status) {
    next.timeline = [
      ...(problemCase.timeline ?? []),
      {
        id: createId("event"),
        at: now,
        title: "Статус изменен",
        description: `Новый статус: ${input.status}.`
      }
    ];
  }

  next.nextAction = buildNextAction(next);
  return next;
}

export function addEvidenceToCase(problemCase, input) {
  const now = nowIso();
  const evidence = {
    id: createId("evidence"),
    caseId: problemCase.id,
    evidenceType: input.evidenceType || "",
    fileName: input.fileName || input.title || "Материал",
    fileType: input.fileType || "application/octet-stream",
    fileSize: Number(input.fileSize ?? 0),
    fileData: input.fileData || "",
    title: input.title || input.fileName || "Доказательство",
    description: input.description || "",
    uploadedAt: now
  };

  const next = {
    ...problemCase,
    evidence: [...(problemCase.evidence ?? []), evidence],
    updatedAt: now,
    timeline: [
      ...(problemCase.timeline ?? []),
      {
        id: createId("event"),
        at: now,
        title: "Добавлено доказательство",
        description: evidence.title
      }
    ]
  };

  next.nextAction = buildNextAction(next);
  return { next, evidence };
}
