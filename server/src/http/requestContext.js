import { assertRole, canAccessCase, ROLES } from "../services/rbacService.js";
import { createRepositories } from "../repositories/index.js";
import { createHttpError, getBearerToken } from "../utils/http.js";

export function findUserByToken(data, token) {
  return createRepositories(data).users.findByToken(token);
}

export async function requireUser(req, store) {
  const data = await store.read();
  const user = findUserByToken(data, getBearerToken(req));
  if (!user) {
    throw createHttpError(401, "Нужно войти в аккаунт");
  }
  return { data, user };
}

export function requireAdmin(user) {
  assertRole(user, ROLES.ADMIN, "Admin role required");
}

export function getCaseForUser(data, user, caseId) {
  const problemCase = createRepositories(data).cases.findById(caseId);
  if (!problemCase) {
    throw createHttpError(404, "Дело не найдено");
  }
  if (!canAccessCase(user, problemCase)) {
    throw createHttpError(403, "Нет доступа к этому делу");
  }
  return problemCase;
}

export function findEvidenceForUser(data, user, evidenceId) {
  const found = createRepositories(data).cases.findByEvidenceId(evidenceId);
  if (found) {
    if (!canAccessCase(user, found.problemCase)) {
      throw createHttpError(403, "Нет доступа к этому доказательству");
    }

    return found;
  }

  throw createHttpError(404, "Доказательство не найдено");
}
