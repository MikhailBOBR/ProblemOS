import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { JsonStore } from "./data/store.js";
import { CATEGORIES, getCategory } from "./domain/categories.js";
import { CASE_STATUS_META } from "./domain/statuses.js";
import { analyzeProblem } from "./services/aiService.js";
import { addEvidenceToCase, createCaseFromInput, enrichCase, updateCaseWithInput } from "./services/caseService.js";
import { attachGeneratedDocument, buildCasePackage, generateDocument, toRtf } from "./services/documentService.js";
import { openEvidenceFile, persistEvidenceFile, sanitizeFileName } from "./services/fileStorageService.js";
import { buildDeadlineNotifications, createNotification } from "./services/notificationService.js";
import { performCaseAction } from "./services/workflowService.js";
import { createBotDraftFromMessage, extractTelegramMessage, formatTelegramCases, formatTelegramNextAction } from "./telegram/botAdapter.js";
import { createId } from "./utils/id.js";
import { createSessionToken, hashPassword, sanitizeUser, verifyPassword } from "./utils/security.js";
import { createHttpError, getBearerToken, parseRequestUrl, readJson, sendError, sendJson, sendText, serveStatic } from "./utils/http.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DEFAULT_STATIC_ROOT = join(__dirname, "..", "..", "web");
const DEFAULT_UPLOAD_ROOT = join(process.cwd(), "server", "data", "uploads");

function findUserByToken(data, token) {
  if (!token || !data.sessions[token]) {
    return null;
  }
  return data.users.find((user) => user.id === data.sessions[token].userId) ?? null;
}

async function requireUser(req, store) {
  const data = await store.read();
  const user = findUserByToken(data, getBearerToken(req));
  if (!user) {
    throw createHttpError(401, "Нужно войти в аккаунт");
  }
  return { data, user };
}

function requireAdmin(user) {
  if (user.role !== "admin") {
    throw createHttpError(403, "Нужны права администратора");
  }
}

function getCaseForUser(data, user, caseId) {
  const problemCase = data.cases.find((item) => item.id === caseId);
  if (!problemCase) {
    throw createHttpError(404, "Дело не найдено");
  }
  if (user.role !== "admin" && problemCase.userId !== user.id) {
    throw createHttpError(403, "Нет доступа к этому делу");
  }
  return problemCase;
}

function findEvidenceForUser(data, user, evidenceId) {
  for (const problemCase of data.cases) {
    const evidence = (problemCase.evidence ?? []).find((item) => item.id === evidenceId);
    if (!evidence) {
      continue;
    }

    if (user.role !== "admin" && problemCase.userId !== user.id) {
      throw createHttpError(403, "Нет доступа к этому доказательству");
    }

    return { problemCase, evidence };
  }

  throw createHttpError(404, "Доказательство не найдено");
}

function replaceCase(data, nextCase) {
  const index = data.cases.findIndex((item) => item.id === nextCase.id);
  if (index === -1) {
    throw createHttpError(404, "Дело не найдено");
  }
  data.cases[index] = nextCase;
}

function matchPath(pathname, pattern) {
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

function getTemplatesForCategory(data, categoryId) {
  return data.documentTemplates.filter((template) => template.categoryId === categoryId && template.isActive);
}

async function routeApi(req, res, store, options = {}) {
  const url = parseRequestUrl(req);
  const { pathname } = url;
  const method = req.method ?? "GET";
  const uploadRoot = options.uploadRoot ?? DEFAULT_UPLOAD_ROOT;

  if (method === "GET" && pathname === "/api/health") {
    sendJson(res, 200, { ok: true, service: "ProblemOS", time: new Date().toISOString() });
    return true;
  }

  if (method === "POST" && pathname === "/api/auth/register") {
    const body = await readJson(req);
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const fullName = String(body.fullName ?? "").trim();

    if (!email || !password || password.length < 6) {
      throw createHttpError(400, "Укажите email и пароль от 6 символов");
    }

    const result = await store.mutate((data) => {
      if (data.users.some((user) => user.email === email)) {
        throw createHttpError(409, "Пользователь с таким email уже есть");
      }

      const user = {
        id: createId("user"),
        email,
        passwordHash: hashPassword(password),
        fullName: fullName || email,
        phone: "",
        telegramId: "",
        role: "user",
        createdAt: new Date().toISOString()
      };
      const token = createSessionToken();
      data.users.push(user);
      data.sessions[token] = { userId: user.id, createdAt: new Date().toISOString() };
      return { token, user: sanitizeUser(user) };
    });

    sendJson(res, 201, result);
    return true;
  }

  if (method === "POST" && pathname === "/api/auth/login") {
    const body = await readJson(req);
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    const result = await store.mutate((data) => {
      const user = data.users.find((item) => item.email === email);
      if (!user || !verifyPassword(password, user.passwordHash)) {
        throw createHttpError(401, "Неверный email или пароль");
      }
      const token = createSessionToken();
      data.sessions[token] = { userId: user.id, createdAt: new Date().toISOString() };
      return { token, user: sanitizeUser(user) };
    });

    sendJson(res, 200, result);
    return true;
  }

  if (method === "GET" && pathname === "/api/me") {
    const { user } = await requireUser(req, store);
    sendJson(res, 200, { user: sanitizeUser(user) });
    return true;
  }

  if (method === "GET" && pathname === "/api/categories") {
    const data = await store.read();
    sendJson(res, 200, { items: data.categories ?? CATEGORIES, statuses: CASE_STATUS_META });
    return true;
  }

  if (method === "POST" && pathname === "/api/ai/analyze") {
    const body = await readJson(req);
    sendJson(res, 200, analyzeProblem(String(body.text ?? "")));
    return true;
  }

  if (method === "POST" && pathname === "/api/telegram/draft") {
    const body = await readJson(req);
    sendJson(res, 200, createBotDraftFromMessage(String(body.text ?? "")));
    return true;
  }

  if (method === "POST" && pathname === "/api/telegram/link") {
    const { user } = await requireUser(req, store);
    const body = await readJson(req);
    const telegramId = String(body.telegramId ?? "").trim();

    if (!telegramId) {
      throw createHttpError(400, "Укажите Telegram ID");
    }

    const result = await store.mutate((data) => {
      const freshUser = data.users.find((item) => item.id === user.id);
      freshUser.telegramId = telegramId;
      return { user: sanitizeUser(freshUser) };
    });

    sendJson(res, 200, result);
    return true;
  }

  if (method === "POST" && pathname === "/api/telegram/webhook") {
    const update = await readJson(req);
    const message = extractTelegramMessage(update);

    if (!message.telegramId) {
      throw createHttpError(400, "В webhook нет Telegram ID");
    }

    const result = await store.mutate((data) => {
      const telegramUser = data.users.find((item) => String(item.telegramId) === String(message.telegramId));

      if (!telegramUser) {
        return {
          ok: true,
          chatId: message.chatId,
          text: "Аккаунт не привязан. Откройте сайт ProblemOS и привяжите Telegram ID в профиле."
        };
      }

      const userCases = data.cases.filter((item) => item.userId === telegramUser.id);
      const text = message.text.trim();

      if (text === "/start" || text === "/help") {
        return {
          ok: true,
          chatId: message.chatId,
          text: "ProblemOS готов. Команды: /newcase описание, /mycases, /next."
        };
      }

      if (text === "/mycases") {
        return {
          ok: true,
          chatId: message.chatId,
          text: formatTelegramCases(userCases)
        };
      }

      if (text === "/next") {
        return {
          ok: true,
          chatId: message.chatId,
          text: formatTelegramNextAction(userCases)
        };
      }

      if (text.startsWith("/newcase")) {
        const description = text.replace("/newcase", "").trim();
        if (!description) {
          return {
            ok: true,
            chatId: message.chatId,
            text: "Напишите так: /newcase Купил товар, он сломался, магазин не возвращает деньги"
          };
        }

        const { problemCase, analysis } = createCaseFromInput(telegramUser.id, { description });
        data.cases.push(problemCase);
        data.notifications.push(
          createNotification({
            userId: telegramUser.id,
            caseId: problemCase.id,
            type: "telegram_case_created",
            title: "Дело создано через Telegram",
            message: problemCase.nextAction
          })
        );

        return {
          ok: true,
          chatId: message.chatId,
          caseId: problemCase.id,
          text: `Дело создано: ${problemCase.title}\nКатегория: ${analysis.categoryName}\nСледующий шаг: ${problemCase.nextAction}`
        };
      }

      const draft = createBotDraftFromMessage(text);
      return {
        ok: true,
        chatId: message.chatId,
        text: draft.reply,
        suggestedActions: draft.suggestedActions
      };
    });

    sendJson(res, 200, result);
    return true;
  }

  if (method === "GET" && pathname === "/api/cases") {
    const { data, user } = await requireUser(req, store);
    const items = data.cases
      .filter((item) => user.role === "admin" || item.userId === user.id)
      .map((item) => enrichCase(item, data))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    sendJson(res, 200, { items });
    return true;
  }

  if (method === "POST" && pathname === "/api/cases") {
    const { user } = await requireUser(req, store);
    const body = await readJson(req);

    const result = await store.mutate((data) => {
      const { problemCase, analysis } = createCaseFromInput(user.id, body);
      data.cases.push(problemCase);
      data.notifications.push(
        createNotification({
          userId: user.id,
          caseId: problemCase.id,
          type: "next_action",
          title: "Дело создано",
          message: problemCase.nextAction
        })
      );
      return { item: enrichCase(problemCase, data), analysis };
    });

    sendJson(res, 201, result);
    return true;
  }

  const caseParams = matchPath(pathname, "/api/cases/:id");
  if (caseParams && method === "GET") {
    const { data, user } = await requireUser(req, store);
    const problemCase = getCaseForUser(data, user, caseParams.id);
    sendJson(res, 200, { item: enrichCase(problemCase, data) });
    return true;
  }

  if (caseParams && method === "PATCH") {
    const { user } = await requireUser(req, store);
    const body = await readJson(req);

    const result = await store.mutate((data) => {
      const problemCase = getCaseForUser(data, user, caseParams.id);
      const nextCase = updateCaseWithInput(problemCase, body);
      replaceCase(data, nextCase);
      return { item: enrichCase(nextCase, data) };
    });

    sendJson(res, 200, result);
    return true;
  }

  const actionParams = matchPath(pathname, "/api/cases/:id/actions");
  if (actionParams && method === "POST") {
    const { user } = await requireUser(req, store);
    const body = await readJson(req);

    const result = await store.mutate((data) => {
      const problemCase = getCaseForUser(data, user, actionParams.id);
      const nextCase = performCaseAction(problemCase, String(body.action ?? ""), body);
      replaceCase(data, nextCase);
      data.notifications.push(
        createNotification({
          userId: nextCase.userId,
          caseId: nextCase.id,
          type: "workflow",
          title: "Дело обновлено",
          message: nextCase.nextAction
        })
      );
      return { item: enrichCase(nextCase, data) };
    });

    sendJson(res, 200, result);
    return true;
  }

  const evidenceParams = matchPath(pathname, "/api/cases/:id/evidence");
  if (evidenceParams && method === "POST") {
    const { user } = await requireUser(req, store);
    const body = await readJson(req);

    const result = await store.mutate(async (data) => {
      const problemCase = getCaseForUser(data, user, evidenceParams.id);
      const evidenceId = createId("evidence");
      const fileMeta = await persistEvidenceFile({
        uploadRoot,
        caseId: problemCase.id,
        evidenceId,
        fileName: body.fileName || body.title,
        fileType: body.fileType,
        fileData: body.fileData
      });
      const { next, evidence } = addEvidenceToCase(problemCase, { ...body, id: evidenceId }, fileMeta);
      replaceCase(data, next);
      return { item: evidence, case: enrichCase(next, data) };
    });

    sendJson(res, 201, result);
    return true;
  }

  const evidenceDownloadParams = matchPath(pathname, "/api/evidence/:id/download");
  if (evidenceDownloadParams && method === "GET") {
    const { data, user } = await requireUser(req, store);
    const { evidence } = findEvidenceForUser(data, user, evidenceDownloadParams.id);
    const file = await openEvidenceFile(uploadRoot, evidence);
    res.writeHead(200, {
      "Content-Type": file.fileType,
      "Content-Length": file.size,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(sanitizeFileName(file.fileName))}"`
    });
    file.stream.pipe(res);
    return true;
  }

  const caseDocumentsParams = matchPath(pathname, "/api/cases/:id/documents");
  if (caseDocumentsParams && method === "GET") {
    const { data, user } = await requireUser(req, store);
    const problemCase = getCaseForUser(data, user, caseDocumentsParams.id);
    const documents = (problemCase.documents ?? [])
      .map((id) => data.generatedDocuments.find((document) => document.id === id))
      .filter(Boolean);
    sendJson(res, 200, { items: documents, templates: getTemplatesForCategory(data, problemCase.categoryId) });
    return true;
  }

  const generateParams = matchPath(pathname, "/api/cases/:id/documents/generate");
  if (generateParams && method === "POST") {
    const { user } = await requireUser(req, store);
    const body = await readJson(req);

    const result = await store.mutate((data) => {
      const problemCase = getCaseForUser(data, user, generateParams.id);
      const templates = getTemplatesForCategory(data, problemCase.categoryId);
      const template = templates.find((item) => item.id === body.templateId) ?? templates[0];

      if (!template) {
        throw createHttpError(404, "Для категории нет активного шаблона");
      }

      const owner = data.users.find((item) => item.id === problemCase.userId) ?? user;
      const document = generateDocument(problemCase, owner, template);
      data.generatedDocuments.push(document);
      const nextCase = attachGeneratedDocument(problemCase, document);
      replaceCase(data, nextCase);
      return { item: document, case: enrichCase(nextCase, data) };
    });

    sendJson(res, 201, result);
    return true;
  }

  const packageParams = matchPath(pathname, "/api/cases/:id/package");
  if (packageParams && method === "GET") {
    const { data, user } = await requireUser(req, store);
    const problemCase = getCaseForUser(data, user, packageParams.id);
    const content = buildCasePackage(problemCase, data);
    sendText(res, 200, content, {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(problemCase.title)}.md"`
    });
    return true;
  }

  const downloadParams = matchPath(pathname, "/api/documents/:id/download");
  if (downloadParams && method === "GET") {
    const { data, user } = await requireUser(req, store);
    const document = data.generatedDocuments.find((item) => item.id === downloadParams.id);
    if (!document) {
      throw createHttpError(404, "Документ не найден");
    }
    const problemCase = getCaseForUser(data, user, document.caseId);
    const fileName = `${problemCase.title}-${document.title}.rtf`.replace(/[\\/:*?"<>|]+/g, "-");
    sendText(res, 200, toRtf(document), {
      "Content-Type": "application/rtf; charset=utf-8",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`
    });
    return true;
  }

  if (method === "GET" && pathname === "/api/notifications") {
    const { data, user } = await requireUser(req, store);
    const dynamic = data.cases
      .filter((item) => item.userId === user.id)
      .flatMap((item) => buildDeadlineNotifications(item));
    const items = [...data.notifications, ...dynamic]
      .filter((item) => item.userId === user.id)
      .sort((a, b) => new Date(b.sendAt).getTime() - new Date(a.sendAt).getTime());
    sendJson(res, 200, { items });
    return true;
  }

  const notificationParams = matchPath(pathname, "/api/notifications/:id/read");
  if (notificationParams && method === "PATCH") {
    const { user } = await requireUser(req, store);

    const result = await store.mutate((data) => {
      const notification = data.notifications.find((item) => item.id === notificationParams.id && item.userId === user.id);
      if (!notification) {
        throw createHttpError(404, "Уведомление не найдено");
      }
      notification.isRead = true;
      return { item: notification };
    });

    sendJson(res, 200, result);
    return true;
  }

  if (method === "GET" && pathname === "/api/admin/stats") {
    const { data, user } = await requireUser(req, store);
    requireAdmin(user);

    const byStatus = Object.fromEntries(CASE_STATUS_META.map((status) => [status.id, 0]));
    for (const item of data.cases) {
      byStatus[item.status] = (byStatus[item.status] ?? 0) + 1;
    }

    sendJson(res, 200, {
      users: data.users.length,
      cases: data.cases.length,
      documents: data.generatedDocuments.length,
      evidence: data.cases.reduce((sum, item) => sum + (item.evidence?.length ?? 0), 0),
      byStatus
    });
    return true;
  }

  if (method === "GET" && pathname === "/api/admin/templates") {
    const { data, user } = await requireUser(req, store);
    requireAdmin(user);
    sendJson(res, 200, { items: data.documentTemplates, categories: data.categories });
    return true;
  }

  const templateParams = matchPath(pathname, "/api/admin/templates/:id");
  if (templateParams && method === "PATCH") {
    const { user } = await requireUser(req, store);
    requireAdmin(user);
    const body = await readJson(req);

    const result = await store.mutate((data) => {
      const template = data.documentTemplates.find((item) => item.id === templateParams.id);
      if (!template) {
        throw createHttpError(404, "Шаблон не найден");
      }
      template.title = body.title ?? template.title;
      template.body = body.body ?? template.body;
      template.isActive = body.isActive ?? template.isActive;
      return { item: template };
    });

    sendJson(res, 200, result);
    return true;
  }

  sendJson(res, 404, { error: "API route not found" });
  return true;
}

export function createProblemOsServer(options = {}) {
  const store = new JsonStore(options.dataFile);
  const staticRoot = options.staticRoot ?? DEFAULT_STATIC_ROOT;
  const uploadRoot = options.uploadRoot ?? DEFAULT_UPLOAD_ROOT;

  return createServer(async (req, res) => {
    try {
      const url = parseRequestUrl(req);
      if (url.pathname.startsWith("/api/")) {
        await routeApi(req, res, store, { uploadRoot });
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
    uploadRoot: process.env.UPLOAD_ROOT
  });

  server.listen(port, host, () => {
    console.log(`ProblemOS is running at http://${host}:${port}`);
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  startServer();
}
