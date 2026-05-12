import { assertRole, canAccessCase, ROLES } from "../services/rbacService.js";
import { createHttpError, getBearerToken } from "../utils/http.js";

export function findUserByToken(data, token) {
  if (!token || !data.sessions[token]) {
    return null;
  }
  return data.users.find((user) => user.id === data.sessions[token].userId) ?? null;
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
  const problemCase = data.cases.find((item) => item.id === caseId);
  if (!problemCase) {
    throw createHttpError(404, "Дело не найдено");
  }
  if (!canAccessCase(user, problemCase)) {
    throw createHttpError(403, "Нет доступа к этому делу");
  }
  return problemCase;
}

export function findEvidenceForUser(data, user, evidenceId) {
  for (const problemCase of data.cases) {
    const evidence = (problemCase.evidence ?? []).find((item) => item.id === evidenceId);
    if (!evidence) {
      continue;
    }

    if (!canAccessCase(user, problemCase)) {
      throw createHttpError(403, "Нет доступа к этому доказательству");
    }

    return { problemCase, evidence };
  }

  throw createHttpError(404, "Доказательство не найдено");
}
