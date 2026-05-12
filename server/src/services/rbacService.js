import { createHttpError } from "../utils/http.js";

export const ROLES = {
  USER: "user",
  ADMIN: "admin",
  EXPERT: "expert"
};

export const ROLE_LABELS = {
  [ROLES.USER]: "User",
  [ROLES.ADMIN]: "Admin",
  [ROLES.EXPERT]: "Expert"
};

export function isAdmin(user) {
  return user?.role === ROLES.ADMIN;
}

export function isExpert(user) {
  return user?.role === ROLES.EXPERT;
}

export function hasAnyRole(user, roles) {
  return roles.includes(user?.role);
}

export function assertRole(user, roles, message = "Insufficient permissions") {
  const allowed = Array.isArray(roles) ? roles : [roles];
  if (!hasAnyRole(user, allowed)) {
    throw createHttpError(403, message);
  }
}

export function canAccessCase(user, problemCase) {
  if (!user || !problemCase) return false;
  if (isAdmin(user)) return true;
  if (problemCase.userId === user.id) return true;
  return isExpert(user) && problemCase.expertId === user.id;
}

export function canEditCase(user, problemCase) {
  if (!user || !problemCase) return false;
  return isAdmin(user) || problemCase.userId === user.id;
}

export function canReviewCase(user, problemCase) {
  if (!user || !problemCase) return false;
  return isAdmin(user) || (isExpert(user) && problemCase.expertId === user.id);
}

export function assertCaseAccess(user, problemCase, message = "Case access denied") {
  if (!canAccessCase(user, problemCase)) {
    throw createHttpError(403, message);
  }
}

export function assertCaseEdit(user, problemCase, message = "Case edit denied") {
  if (!canEditCase(user, problemCase)) {
    throw createHttpError(403, message);
  }
}

export function assertCaseReview(user, problemCase, message = "Expert review access denied") {
  if (!canReviewCase(user, problemCase)) {
    throw createHttpError(403, message);
  }
}

export function sanitizeRole(value) {
  return Object.values(ROLES).includes(value) ? value : ROLES.USER;
}
