import { getCategory } from "../domain/categories.js";
import { CASE_STATUS, STEP_STATUS } from "../domain/statuses.js";
import { addDaysIso, createId, nowIso } from "../utils/id.js";
import { buildNextAction } from "./nextActionService.js";

const ACTIONS = {
  COMPLETE_CURRENT_STEP: "complete_current_step",
  MARK_SENT: "mark_sent",
  MARK_DEADLINE_MISSED: "mark_deadline_missed",
  START_ESCALATION: "start_escalation",
  CLOSE_CASE: "close_case",
  REOPEN_CASE: "reopen_case"
};

function createWorkflowError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  error.publicMessage = message;
  return error;
}

function cloneSteps(problemCase) {
  return (problemCase.steps ?? []).map((step) => ({ ...step }));
}

function appendTimeline(problemCase, title, description) {
  return [
    ...(problemCase.timeline ?? []),
    {
      id: createId("event"),
      at: nowIso(),
      title,
      description
    }
  ];
}

function getStepStatusFromTitle(title, fallbackStatus) {
  const normalized = title.toLowerCase();

  if (normalized.includes("загруз") || normalized.includes("доказ")) {
    return CASE_STATUS.EVIDENCE_COLLECTION;
  }

  if (normalized.includes("подготов")) {
    return CASE_STATUS.EVIDENCE_COLLECTION;
  }

  if (normalized.includes("отправ")) {
    return CASE_STATUS.DOCUMENT_READY;
  }

  if (normalized.includes("дожд")) {
    return CASE_STATUS.WAITING_RESPONSE;
  }

  if (normalized.includes("жалоб") || normalized.includes("досуд")) {
    return CASE_STATUS.ESCALATION;
  }

  return fallbackStatus;
}

function activateStepByPredicate(steps, predicate) {
  let activated = false;

  for (const step of steps) {
    if (!activated && predicate(step)) {
      step.status = STEP_STATUS.ACTIVE;
      activated = true;
    } else if (step.status === STEP_STATUS.ACTIVE) {
      step.status = STEP_STATUS.TODO;
    }
  }

  return activated;
}

function finishActiveStep(steps) {
  const activeIndex = steps.findIndex((step) => step.status === STEP_STATUS.ACTIVE);

  if (activeIndex === -1) {
    const firstTodoIndex = steps.findIndex((step) => step.status === STEP_STATUS.TODO);
    if (firstTodoIndex === -1) {
      return { nextStep: null, completedStep: null };
    }

    steps[firstTodoIndex].status = STEP_STATUS.DONE;
    steps[firstTodoIndex].completedAt = nowIso();
    const nextStep = steps[firstTodoIndex + 1] ?? null;
    if (nextStep) {
      nextStep.status = STEP_STATUS.ACTIVE;
    }
    return { nextStep, completedStep: steps[firstTodoIndex] };
  }

  steps[activeIndex].status = STEP_STATUS.DONE;
  steps[activeIndex].completedAt = nowIso();
  const nextStep = steps[activeIndex + 1] ?? null;
  if (nextStep) {
    nextStep.status = STEP_STATUS.ACTIVE;
  }

  return { nextStep, completedStep: steps[activeIndex] };
}

function markMatchingStepDone(steps, fragments) {
  const step = steps.find((item) => fragments.some((fragment) => item.title.toLowerCase().includes(fragment)));
  if (step) {
    step.status = STEP_STATUS.DONE;
    step.completedAt = step.completedAt || nowIso();
  }
  return step;
}

export function performCaseAction(problemCase, action, input = {}) {
  if (!Object.values(ACTIONS).includes(action)) {
    throw createWorkflowError("Неизвестное действие по делу");
  }

  const now = nowIso();
  const category = getCategory(problemCase.categoryId);
  const steps = cloneSteps(problemCase);
  let next = {
    ...problemCase,
    steps,
    updatedAt: now
  };

  if (action === ACTIONS.COMPLETE_CURRENT_STEP) {
    const { nextStep, completedStep } = finishActiveStep(steps);
    next.status = nextStep ? getStepStatusFromTitle(nextStep.title, next.status) : CASE_STATUS.CLOSED;
    next.closedAt = next.status === CASE_STATUS.CLOSED ? now : next.closedAt;
    next.timeline = appendTimeline(
      problemCase,
      "Шаг выполнен",
      completedStep ? completedStep.title : "Активных шагов не осталось"
    );
  }

  if (action === ACTIONS.MARK_SENT) {
    markMatchingStepDone(steps, ["отправ"]);
    activateStepByPredicate(steps, (step) => step.title.toLowerCase().includes("дожд"));
    const deadlineAt = addDaysIso(category.defaultDeadlineDays);
    const waitingStep = steps.find((step) => step.status === STEP_STATUS.ACTIVE);
    if (waitingStep) {
      waitingStep.deadlineAt = deadlineAt;
    }
    next.status = CASE_STATUS.WAITING_RESPONSE;
    next.deadlineAt = deadlineAt;
    next.timeline = appendTimeline(
      problemCase,
      "Обращение отправлено",
      input.comment || "Пользователь отметил отправку обращения и начал ожидание ответа."
    );
  }

  if (action === ACTIONS.MARK_DEADLINE_MISSED) {
    next.status = CASE_STATUS.DEADLINE_MISSED;
    next.timeline = appendTimeline(
      problemCase,
      "Срок нарушен",
      input.comment || "Срок ответа истек, дело готово к эскалации."
    );
  }

  if (action === ACTIONS.START_ESCALATION) {
    markMatchingStepDone(steps, ["дожд"]);
    activateStepByPredicate(steps, (step) => step.title.toLowerCase().includes("жалоб") || step.title.toLowerCase().includes("досуд"));
    next.status = CASE_STATUS.ESCALATION;
    next.timeline = appendTimeline(
      problemCase,
      "Начата эскалация",
      input.comment || "Система перевела дело к следующему уровню обращения."
    );
  }

  if (action === ACTIONS.CLOSE_CASE) {
    next.status = CASE_STATUS.CLOSED;
    next.closedAt = now;
    for (const step of steps) {
      if (step.status === STEP_STATUS.ACTIVE || step.status === STEP_STATUS.TODO) {
        step.status = STEP_STATUS.DONE;
        step.completedAt = step.completedAt || now;
      }
    }
    next.result = input.result ?? next.result;
    next.timeline = appendTimeline(problemCase, "Дело закрыто", input.comment || input.result || "Пользователь закрыл дело.");
  }

  if (action === ACTIONS.REOPEN_CASE) {
    next.status = CASE_STATUS.EVIDENCE_COLLECTION;
    next.closedAt = null;
    activateStepByPredicate(steps, (step) => step.status !== STEP_STATUS.DONE);
    next.timeline = appendTimeline(problemCase, "Дело возвращено в работу", input.comment || "Дело снова активно.");
  }

  next.nextAction = buildNextAction(next);
  return next;
}

export { ACTIONS as CASE_ACTIONS };
