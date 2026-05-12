import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon"
};

export async function readJson(req, limitBytes = 10 * 1024 * 1024) {
  const chunks = [];
  let size = 0;

  for await (const chunk of req) {
    size += chunk.length;
    if (size > limitBytes) {
      const error = new Error("Payload too large");
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return {};
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw.trim()) {
    return {};
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    error.statusCode = 400;
    error.publicMessage = "Некорректный JSON";
    throw error;
  }
}

export function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(body);
}

export function sendText(res, statusCode, body, headers = {}) {
  res.writeHead(statusCode, {
    "Content-Type": "text/plain; charset=utf-8",
    ...headers
  });
  res.end(body);
}

export function sendError(res, error) {
  const statusCode = error.statusCode ?? 500;
  const message = error.publicMessage ?? error.message ?? "Server error";
  sendJson(res, statusCode, { error: message });
}

export function getBearerToken(req) {
  const header = req.headers.authorization ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

export function parseRequestUrl(req) {
  return new URL(req.url, `http://${req.headers.host ?? "127.0.0.1"}`);
}

export function serveStatic(req, res, staticRoot) {
  const url = parseRequestUrl(req);
  const requested = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  const safePath = normalize(requested).replace(/^(\.\.[/\\])+/, "");
  const absoluteRoot = resolve(staticRoot);
  const filePath = resolve(join(absoluteRoot, safePath));

  if (!filePath.startsWith(absoluteRoot)) {
    sendText(res, 403, "Forbidden");
    return true;
  }

  const candidate = existsSync(filePath) && statSync(filePath).isFile() ? filePath : join(absoluteRoot, "index.html");
  if (!existsSync(candidate)) {
    sendText(res, 404, "Not found");
    return true;
  }

  const extension = extname(candidate);
  res.writeHead(200, {
    "Content-Type": MIME_TYPES[extension] ?? "application/octet-stream",
    "Cache-Control": extension === ".html" ? "no-store" : "public, max-age=300"
  });
  createReadStream(candidate).pipe(res);
  return true;
}

export function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.publicMessage = message;
  return error;
}
