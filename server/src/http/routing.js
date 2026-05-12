import { createRepositories } from "../repositories/index.js";

export function replaceCase(data, nextCase) {
  return createRepositories(data).cases.replace(nextCase);
}

export function matchPath(pathname, pattern) {
  const names = [];
  const source = pattern
    .replace(/:[^/]+/g, (part) => {
      names.push(part.slice(1));
      return "([^/]+)";
    })
    .replace(/\//g, "\\/");
  const match = pathname.match(new RegExp(`^${source}$`));

  if (!match) {
    return null;
  }

  return Object.fromEntries(names.map((name, index) => [name, decodeURIComponent(match[index + 1])]));
}

export function getTemplatesForCategory(data, categoryId) {
  return createRepositories(data).documentTemplates.listActiveByCategory(categoryId);
}

export function filterCases(items, url) {
  const status = url.searchParams.get("status");
  const categoryId = url.searchParams.get("categoryId");
  const priority = url.searchParams.get("priority");
  const query = (url.searchParams.get("q") || "").trim().toLowerCase();

  return items.filter((item) => {
    if (status && item.status !== status) return false;
    if (categoryId && item.categoryId !== categoryId) return false;
    if (priority && item.priority !== priority) return false;
    if (query) {
      const haystack = [item.title, item.description, item.status, item.priority, item.categoryId].join(" ").toLowerCase();
      return haystack.includes(query);
    }
    return true;
  });
}

export function sendBuffer(res, statusCode, body, headers = {}) {
  res.writeHead(statusCode, {
    "Content-Type": "application/octet-stream",
    "Content-Length": body.length,
    ...headers
  });
  res.end(body);
}
