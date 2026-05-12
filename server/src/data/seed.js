import { CATEGORIES } from "../domain/categories.js";
import { DOCUMENT_TEMPLATES } from "../domain/templates.js";
import { CASE_STATUS } from "../domain/statuses.js";
import { addDaysIso, createId, nowIso } from "../utils/id.js";
import { hashPassword } from "../utils/security.js";

export function createSeedData() {
  const adminId = createId("user");
  const expertId = createId("user");
  const demoId = createId("user");
  const caseId = createId("case");
  const now = nowIso();

  return {
    version: 1,
    users: [
      {
        id: adminId,
        email: "admin@problemos.local",
        passwordHash: hashPassword("admin123"),
        fullName: "Администратор ProblemOS",
        phone: "",
        telegramId: "",
        role: "admin",
        createdAt: now,
        updatedAt: now
      },
      {
        id: expertId,
        email: "expert@problemos.local",
        passwordHash: hashPassword("expert123"),
        fullName: "ProblemOS Expert",
        phone: "",
        telegramId: "",
        role: "expert",
        createdAt: now,
        updatedAt: now
      },
      {
        id: demoId,
        email: "demo@problemos.local",
        passwordHash: hashPassword("demo123"),
        fullName: "Демо Пользователь",
        phone: "",
        telegramId: "",
        role: "user",
        createdAt: now,
        updatedAt: now
      }
    ],
    sessions: {},
    categories: CATEGORIES,
    cases: [
      {
        id: caseId,
        userId: demoId,
        expertId,
        title: "Возврат телефона",
        categoryId: "product_return",
        description: "Купил телефон, через 5 дней он перестал включаться, магазин отказывается возвращать деньги.",
        facts: {
          product_name: "Телефон",
          defect: "Не включается",
          desired_result: "Возврат денег"
        },
        status: CASE_STATUS.EVIDENCE_COLLECTION,
        priority: "medium",
        nextAction: "Загрузите чек, фото товара и переписку с продавцом. После этого можно подготовить претензию.",
        deadlineAt: addDaysIso(10),
        result: "",
        createdAt: now,
        updatedAt: now,
        closedAt: null,
        steps: [
          { id: createId("step"), title: "Собрать факты покупки", status: "done", order: 1, deadlineAt: null, completedAt: now },
          { id: createId("step"), title: "Загрузить чек, фото товара и переписку", status: "active", order: 2, deadlineAt: null, completedAt: null },
          { id: createId("step"), title: "Подготовить претензию продавцу", status: "todo", order: 3, deadlineAt: null, completedAt: null },
          { id: createId("step"), title: "Отправить претензию и сохранить подтверждение", status: "todo", order: 4, deadlineAt: null, completedAt: null },
          { id: createId("step"), title: "Дождаться ответа в срок", status: "todo", order: 5, deadlineAt: addDaysIso(10), completedAt: null },
          { id: createId("step"), title: "Подготовить жалобу или досудебное требование", status: "todo", order: 6, deadlineAt: null, completedAt: null }
        ],
        evidence: [],
        documents: [],
        timeline: [
          { id: createId("event"), at: now, title: "Дело создано", description: "Система определила категорию: Возврат товара." }
        ]
      }
    ],
    documentTemplates: DOCUMENT_TEMPLATES,
    generatedDocuments: [],
    caseComments: [],
    expertRecommendations: [
      {
        id: createId("recommendation"),
        caseId,
        authorId: expertId,
        text: "Upload the receipt, a photo of the defect and the seller response before generating the claim.",
        visibility: "user",
        status: "open",
        createdAt: now,
        updatedAt: now
      }
    ],
    documentTemplateVersions: [],
    notifications: [
      {
        id: createId("notification"),
        userId: demoId,
        caseId,
        type: "next_action",
        title: "Нужно действие по делу",
        message: "Для претензии по возврату товара не хватает доказательств.",
        isRead: false,
        sendAt: now,
        createdAt: now
      }
    ],
    auditLogs: [
      {
        id: createId("audit"),
        actorId: demoId,
        caseId,
        entityType: "case",
        entityId: caseId,
        action: "seed.created",
        title: "Демо-дело создано",
        details: { source: "seed" },
        createdAt: now
      }
    ],
    botSessions: []
  };
}
