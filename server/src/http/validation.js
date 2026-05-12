import { createHttpError, readJson } from "../utils/http.js";

export function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export async function readJsonObject(req) {
  const body = await readJson(req);
  if (!isPlainObject(body)) {
    throw createHttpError(400, "JSON body must be an object");
  }
  return body;
}

export function requireString(body, field, options = {}) {
  const value = normalizeString(body[field]);
  const label = options.label ?? field;
  const min = options.min ?? 1;
  const max = options.max ?? 2000;

  if (value.length < min) {
    throw createHttpError(400, `${label} is required`);
  }

  if (value.length > max) {
    throw createHttpError(400, `${label} is too long`);
  }

  return value;
}

export function optionalString(body, field, options = {}) {
  if (body[field] === undefined || body[field] === null) {
    return options.defaultValue;
  }

  const value = normalizeString(body[field]);
  const max = options.max ?? 2000;
  if (value.length > max) {
    throw createHttpError(400, `${options.label ?? field} is too long`);
  }
  return value;
}

export function optionalBoolean(body, field) {
  if (body[field] === undefined || body[field] === null) {
    return undefined;
  }
  return Boolean(body[field]);
}

export function optionalNumber(body, field, options = {}) {
  if (body[field] === undefined || body[field] === null || body[field] === "") {
    return undefined;
  }

  const value = Number(body[field]);
  if (!Number.isFinite(value)) {
    throw createHttpError(400, `${options.label ?? field} must be a number`);
  }

  if (options.min !== undefined && value < options.min) {
    throw createHttpError(400, `${options.label ?? field} is too small`);
  }

  if (options.max !== undefined && value > options.max) {
    throw createHttpError(400, `${options.label ?? field} is too large`);
  }

  return value;
}

export function optionalStringArray(body, field, options = {}) {
  if (body[field] === undefined || body[field] === null) {
    return undefined;
  }

  if (!Array.isArray(body[field])) {
    throw createHttpError(400, `${options.label ?? field} must be an array`);
  }

  const maxItems = options.maxItems ?? 100;
  if (body[field].length > maxItems) {
    throw createHttpError(400, `${options.label ?? field} has too many items`);
  }

  return body[field].map((item) => normalizeString(item)).filter(Boolean);
}

export function optionalObject(body, field, options = {}) {
  if (body[field] === undefined || body[field] === null) {
    return undefined;
  }

  if (!isPlainObject(body[field])) {
    throw createHttpError(400, `${options.label ?? field} must be an object`);
  }

  return body[field];
}

export function optionalArray(body, field, options = {}) {
  if (body[field] === undefined || body[field] === null) {
    return undefined;
  }

  if (!Array.isArray(body[field])) {
    throw createHttpError(400, `${options.label ?? field} must be an array`);
  }

  if (options.maxItems !== undefined && body[field].length > options.maxItems) {
    throw createHttpError(400, `${options.label ?? field} has too many items`);
  }

  return body[field];
}

function normalizeString(value) {
  return String(value ?? "").trim();
}
