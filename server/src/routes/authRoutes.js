import { appendAuditLog } from "../services/auditLogService.js";
import { requireUser } from "../http/requestContext.js";
import { createId } from "../utils/id.js";
import { createSessionToken, hashPassword, sanitizeUser, verifyPassword } from "../utils/security.js";
import { createHttpError, readJson, sendJson } from "../utils/http.js";

export async function handleAuthRoutes(req, res, store, { pathname, method }) {
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
    const body = await readJson(req);

    const result = await store.mutate((data) => {
      const freshUser = data.users.find((item) => item.id === user.id);
      freshUser.fullName = String(body.fullName ?? freshUser.fullName).trim() || freshUser.email;
      freshUser.phone = String(body.phone ?? freshUser.phone ?? "").trim();
      freshUser.telegramId = String(body.telegramId ?? freshUser.telegramId ?? "").trim();
      freshUser.updatedAt = new Date().toISOString();
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
