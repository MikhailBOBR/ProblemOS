import { appendAuditLog } from "../services/auditLogService.js";
import { requireUser } from "../http/requestContext.js";
import { createRepositories } from "../repositories/index.js";
import { parseLoginRequest, parseProfileRequest, parseRegisterRequest } from "../dto/requestDtos.js";
import { createId } from "../utils/id.js";
import { createSessionToken, hashPassword, sanitizeUser, verifyPassword } from "../utils/security.js";
import { createHttpError, sendJson } from "../utils/http.js";

export async function handleAuthRoutes(req, res, store, { pathname, method }) {
  if (method === "POST" && pathname === "/api/auth/register") {
    const { email, password, fullName } = await parseRegisterRequest(req);

    const result = await store.mutate((data) => {
      const repos = createRepositories(data);
      if (repos.users.findByEmail(email)) {
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
      repos.users.create(user);
      repos.sessions.create(token, user.id);
      appendAuditLog(data, {
        actorId: user.id,
        entityType: "user",
        entityId: user.id,
        action: "user.registered",
        title: "Пользователь зарегистрировался"
      });
      return { token, user: sanitizeUser(user) };
    });

    sendJson(res, 201, result);
    return true;
  }

  if (method === "POST" && pathname === "/api/auth/login") {
    const { email, password } = await parseLoginRequest(req);

    const result = await store.mutate((data) => {
      const repos = createRepositories(data);
      const user = repos.users.findByEmail(email);
      if (!user || !verifyPassword(password, user.passwordHash)) {
        throw createHttpError(401, "Неверный email или пароль");
      }
      const token = createSessionToken();
      repos.sessions.create(token, user.id);
      appendAuditLog(data, {
        actorId: user.id,
        entityType: "user",
        entityId: user.id,
        action: "user.login",
        title: "Пользователь вошел в систему"
      });
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

  if (method === "PATCH" && pathname === "/api/me/profile") {
    const { user } = await requireUser(req, store);
    const body = await parseProfileRequest(req);

    const result = await store.mutate((data) => {
      const repos = createRepositories(data);
      const freshUser = repos.users.findById(user.id);
      freshUser.fullName = String(body.fullName ?? freshUser.fullName).trim() || freshUser.email;
      freshUser.phone = String(body.phone ?? freshUser.phone ?? "").trim();
      freshUser.telegramId = String(body.telegramId ?? freshUser.telegramId ?? "").trim();
      freshUser.updatedAt = new Date().toISOString();
      repos.users.replace(freshUser);
      appendAuditLog(data, {
        actorId: freshUser.id,
        entityType: "user",
        entityId: freshUser.id,
        action: "user.profile_updated",
        title: "Профиль обновлен",
        details: { hasTelegram: Boolean(freshUser.telegramId), hasPhone: Boolean(freshUser.phone) }
      });
      return { user: sanitizeUser(freshUser) };
    });

    sendJson(res, 200, result);
    return true;
  }

  return false;
}
