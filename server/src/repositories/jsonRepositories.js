import { createHttpError } from "../utils/http.js";

function replaceById(items, nextItem, entityName) {
  const index = items.findIndex((item) => item.id === nextItem.id);
  if (index === -1) {
    throw createHttpError(404, `${entityName} not found`);
  }
  items[index] = nextItem;
  return nextItem;
}

export function createJsonRepositories(data) {
  return {
    users: {
      list() {
        return data.users;
      },
      findById(id) {
        return data.users.find((user) => user.id === id) ?? null;
      },
      findByEmail(email) {
        return data.users.find((user) => user.email === email) ?? null;
      },
      findByToken(token) {
        const session = token ? data.sessions[token] : null;
        return session ? data.users.find((user) => user.id === session.userId) ?? null : null;
      },
      create(user) {
        data.users.push(user);
        return user;
      },
      replace(user) {
        return replaceById(data.users, user, "User");
      }
    },

    sessions: {
      create(token, userId, createdAt = new Date().toISOString()) {
        data.sessions[token] = { userId, createdAt };
        return data.sessions[token];
      }
    },

    cases: {
      list() {
        return data.cases;
      },
      findById(id) {
        return data.cases.find((item) => item.id === id) ?? null;
      },
      create(problemCase) {
        data.cases.push(problemCase);
        return problemCase;
      },
      replace(problemCase) {
        return replaceById(data.cases, problemCase, "Case");
      },
      findByEvidenceId(evidenceId) {
        for (const problemCase of data.cases) {
          const evidence = (problemCase.evidence ?? []).find((item) => item.id === evidenceId);
          if (evidence) {
            return { problemCase, evidence };
          }
        }
        return null;
      }
    },

    categories: {
      list() {
        return data.categories;
      },
      findById(id) {
        return data.categories.find((item) => item.id === id) ?? null;
      }
    },

    documentTemplates: {
      list() {
        return data.documentTemplates;
      },
      findById(id) {
        return data.documentTemplates.find((item) => item.id === id) ?? null;
      },
      listActiveByCategory(categoryId) {
        return data.documentTemplates.filter((template) => template.categoryId === categoryId && template.isActive);
      }
    },

    generatedDocuments: {
      list() {
        return data.generatedDocuments;
      },
      findById(id) {
        return data.generatedDocuments.find((item) => item.id === id) ?? null;
      },
      create(document) {
        data.generatedDocuments.push(document);
        return document;
      },
      listByCaseDocumentIds(documentIds = []) {
        return documentIds.map((id) => data.generatedDocuments.find((document) => document.id === id)).filter(Boolean);
      }
    },

    notifications: {
      list() {
        return data.notifications;
      },
      findForUser(id, userId) {
        return data.notifications.find((item) => item.id === id && item.userId === userId) ?? null;
      },
      listForUser(userId) {
        return data.notifications.filter((item) => item.userId === userId);
      },
      create(notification) {
        data.notifications.push(notification);
        return notification;
      }
    },

    auditLogs: {
      list() {
        return data.auditLogs;
      }
    },

    comments: {
      create(comment) {
        data.caseComments.push(comment);
        return comment;
      }
    },

    recommendations: {
      create(recommendation) {
        data.expertRecommendations.push(recommendation);
        return recommendation;
      }
    }
  };
}
