import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { JsonStore } from "./data/store.js";
import { createRateLimiter } from "./services/rateLimitService.js";
import { handleAdminRoutes } from "./routes/adminRoutes.js";
import { handleAnalyticsRoutes } from "./routes/analyticsRoutes.js";
import { handleAuthRoutes } from "./routes/authRoutes.js";
import { handleCaseRoutes } from "./routes/caseRoutes.js";
import { handleDocumentRoutes } from "./routes/documentRoutes.js";
import { handleEvidenceRoutes } from "./routes/evidenceRoutes.js";
import { handleNotificationRoutes } from "./routes/notificationRoutes.js";
import { handleSystemRoutes } from "./routes/systemRoutes.js";
import { handleTelegramRoutes } from "./routes/telegramRoutes.js";
import { parseRequestUrl, sendError, sendJson, serveStatic } from "./utils/http.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DEFAULT_STATIC_ROOT = join(__dirname, "..", "..", "web");
const DEFAULT_UPLOAD_ROOT = join(process.cwd(), "server", "data", "uploads");
const DEFAULT_BACKUP_ROOT = join(process.cwd(), "server", "data", "backups");

async function routeApi(req, res, store, options = {}) {
  const url = parseRequestUrl(req);
  const { pathname } = url;
  const method = req.method ?? "GET";
  const uploadRoot = options.uploadRoot ?? DEFAULT_UPLOAD_ROOT;
  const backupRoot = options.backupRoot ?? DEFAULT_BACKUP_ROOT;
  const startedAt = options.startedAt ?? new Date().toISOString();

  if (await handleSystemRoutes(req, res, store, { pathname, method, uploadRoot, startedAt })) {
    return true;
  }

  if (await handleAnalyticsRoutes(req, res, store, { pathname, method })) {
    return true;
  }

  if (await handleAuthRoutes(req, res, store, { pathname, method })) {
    return true;
  }

  if (await handleCaseRoutes(req, res, store, { pathname, method, url })) {
    return true;
  }

  if (await handleEvidenceRoutes(req, res, store, { pathname, method, uploadRoot })) {
    return true;
  }

  if (await handleDocumentRoutes(req, res, store, { pathname, method, url, uploadRoot })) {
    return true;
  }

  if (await handleNotificationRoutes(req, res, store, { pathname, method })) {
    return true;
  }

  if (await handleTelegramRoutes(req, res, store, { pathname, method })) {
    return true;
  }

  if (await handleAdminRoutes(req, res, store, { pathname, method, url, backupRoot })) {
    return true;
  }

  sendJson(res, 404, { error: "API route not found" });
  return true;
}

export function createProblemOsServer(options = {}) {
  const store = new JsonStore(options.dataFile);
  const staticRoot = options.staticRoot ?? DEFAULT_STATIC_ROOT;
  const uploadRoot = options.uploadRoot ?? DEFAULT_UPLOAD_ROOT;
  const backupRoot = options.backupRoot ?? DEFAULT_BACKUP_ROOT;
  const startedAt = new Date().toISOString();
  const rateLimiter = createRateLimiter(options.rateLimit ?? {});

  return createServer(async (req, res) => {
    try {
      const url = parseRequestUrl(req);
      if (url.pathname.startsWith("/api/")) {
        const limited = options.disableRateLimit ? null : rateLimiter(req, url);
        if (limited) {
          res.writeHead(429, {
            "Content-Type": "application/json; charset=utf-8",
            "Retry-After": String(limited.retryAfter)
          });
          res.end(JSON.stringify({ error: "Слишком много запросов", retryAfter: limited.retryAfter }));
          return;
        }

        await routeApi(req, res, store, { uploadRoot, backupRoot, startedAt });
        return;
      }

      serveStatic(req, res, staticRoot);
    } catch (error) {
      sendError(res, error);
    }
  });
}

export async function startServer() {
  const port = Number(process.env.SERVER_PORT ?? 8080);
  const host = process.env.SERVER_HOST ?? "127.0.0.1";
  const server = createProblemOsServer({
    dataFile: process.env.DATA_FILE,
    staticRoot: process.env.STATIC_ROOT,
    uploadRoot: process.env.UPLOAD_ROOT,
    backupRoot: process.env.BACKUP_ROOT
  });

  server.listen(port, host, () => {
    console.log(`ProblemOS is running at http://${host}:${port}`);
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  startServer();
}
