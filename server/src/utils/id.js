import { randomUUID } from "node:crypto";

export function createId(prefix = "id") {
  return `${prefix}_${randomUUID().replaceAll("-", "").slice(0, 18)}`;
}

export function nowIso() {
  return new Date().toISOString();
}

export function addDaysIso(days, from = new Date()) {
  const date = new Date(from);
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

export function formatDateRu(dateLike = new Date()) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(dateLike));
}
