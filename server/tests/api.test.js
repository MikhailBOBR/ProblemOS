import { once } from "node:events";
import { mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import assert from "node:assert/strict";
import { createProblemOsServer } from "../src/index.js";

async function startTestServer(options = {}) {
  const dir = await mkdtemp(join(tmpdir(), "problemos-"));
  const server = createProblemOsServer({
    dataFile: join(dir, "data.json"),
    uploadRoot: join(dir, "uploads"),
    backupRoot: join(dir, "backups"),
    staticRoot: join(process.cwd(), "web"),
    ...options
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  return {
    server,
    baseUrl: `http://127.0.0.1:${address.port}`
  };
}

async function api(baseUrl, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {})
    }
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  return { response, body };
}

test("core user flow: register, create case, evidence, document, package", async (t) => {
  const { server, baseUrl } = await startTestServer();
  t.after(() => server.close());

  const registered = await api(baseUrl, "/api/auth/register", {
    method: "POST",
    body: JSON.stringify({
      email: "user@example.test",
      password: "secret123",
      fullName: "Иван Иванов"
    })
  });

  assert.equal(registered.response.status, 201);
  const token = registered.body.token;

  const profile = await api(baseUrl, "/api/me/profile", {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      fullName: "Иван Петров",
      phone: "+79000000000",
      telegramId: "555001"
    })
  });

  assert.equal(profile.response.status, 200);
  assert.equal(profile.body.user.telegramId, "555001");

  const categories = await api(baseUrl, "/api/categories");
  assert.equal(categories.response.status, 200);
  assert.ok(categories.body.items.length >= 3);

  const analysis = await api(baseUrl, "/api/ai/analyze", {
    method: "POST",
    body: JSON.stringify({ text: "Купил телефон, он не включается, хочу возврат денег" })
  });
  assert.equal(analysis.body.categoryId, "product_return");

  const created = await api(baseUrl, "/api/cases", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      description: "Купил телефон, через 5 дней он не включается, магазин не возвращает деньги",
      facts: {
        seller_name: "Магазин Тест",
        purchase_date: "05.05.2026"
      }
    })
  });

  assert.equal(created.response.status, 201);
  assert.equal(created.body.item.categoryId, "product_return");
  assert.ok(created.body.item.nextAction.includes("доказательства"));

  const caseId = created.body.item.id;
  const evidence = await api(baseUrl, `/api/cases/${caseId}/evidence`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      evidenceType: "receipt",
      title: "Чек",
      fileName: "receipt.png",
      fileType: "image/png",
      fileSize: 5,
      fileData: "data:image/png;base64,aGVsbG8="
    })
  });

  assert.equal(evidence.response.status, 201);
  assert.equal(evidence.body.item.title, "Чек");
  assert.equal(evidence.body.item.hasFile, true);
  assert.ok(evidence.body.item.fileHash);

  const evidenceDownload = await fetch(`${baseUrl}/api/evidence/${evidence.body.item.id}/download`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  assert.equal(evidenceDownload.status, 200);
  assert.equal(await evidenceDownload.text(), "hello");

  const completeness = await api(baseUrl, `/api/cases/${caseId}/completeness`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  assert.equal(completeness.response.status, 200);
  assert.ok(completeness.body.item.score >= 40);
  assert.ok(completeness.body.item.activeTemplates.length >= 1);

  const documentOptions = await api(baseUrl, `/api/cases/${caseId}/documents`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  assert.equal(documentOptions.response.status, 200);
  assert.ok(documentOptions.body.templates.length >= 1);

  const generated = await api(baseUrl, `/api/cases/${caseId}/documents/generate`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ templateId: documentOptions.body.templates[0].id })
  });

  assert.equal(generated.response.status, 201);
  assert.ok(generated.body.item.content.includes("ПРЕТЕНЗИЯ"));

  const rtf = await fetch(`${baseUrl}/api/documents/${generated.body.item.id}/download?format=rtf`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  assert.equal(rtf.status, 200);
  assert.equal((await rtf.text()).startsWith("{\\rtf"), true);

  const docx = await fetch(`${baseUrl}/api/documents/${generated.body.item.id}/download?format=docx`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  assert.equal(docx.status, 200);
  assert.equal(Buffer.from(await docx.arrayBuffer()).subarray(0, 2).toString("utf8"), "PK");

  const pdf = await fetch(`${baseUrl}/api/documents/${generated.body.item.id}/download?format=pdf`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  assert.equal(pdf.status, 200);
  assert.equal(Buffer.from(await pdf.arrayBuffer()).subarray(0, 4).toString("utf8"), "%PDF");

  const sent = await api(baseUrl, `/api/cases/${caseId}/actions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ action: "mark_sent" })
  });

  assert.equal(sent.response.status, 200);
  assert.equal(sent.body.item.status, "waiting_response");

  const pastDeadline = await api(baseUrl, `/api/cases/${caseId}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      status: "waiting_response",
      deadlineAt: "2026-01-01T00:00:00.000Z"
    })
  });
  assert.equal(pastDeadline.response.status, 200);

  const notifications = await api(baseUrl, "/api/notifications", {
    headers: { Authorization: `Bearer ${token}` }
  });
  assert.equal(notifications.response.status, 200);
  assert.ok(notifications.body.items.some((item) => item.type === "deadline_missed"));
  assert.ok(notifications.body.unread >= 1);

  const readAll = await api(baseUrl, "/api/notifications/read-all", {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({})
  });
  assert.equal(readAll.response.status, 200);
  assert.ok(readAll.body.updated >= 1);

  const escalation = await api(baseUrl, `/api/cases/${caseId}/actions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ action: "start_escalation" })
  });

  assert.equal(escalation.response.status, 200);
  assert.equal(escalation.body.item.status, "escalation");

  const comment = await api(baseUrl, `/api/cases/${caseId}/comments`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ text: "Проверить подтверждение отправки перед эскалацией." })
  });
  assert.equal(comment.response.status, 201);
  assert.equal(comment.body.item.text.includes("подтверждение"), true);

  const comments = await api(baseUrl, `/api/cases/${caseId}/comments`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  assert.equal(comments.response.status, 200);
  assert.equal(comments.body.items.length, 1);

  const list = await api(baseUrl, "/api/cases", {
    headers: { Authorization: `Bearer ${token}` }
  });

  assert.equal(list.body.items.length, 1);
  assert.equal(list.body.items[0].documents.length, 1);
  assert.equal(list.body.items[0].comments.length, 1);
  assert.ok(list.body.items[0].auditLog.length >= 4);

  const filtered = await api(baseUrl, "/api/cases?status=escalation&q=телефон", {
    headers: { Authorization: `Bearer ${token}` }
  });
  assert.equal(filtered.response.status, 200);
  assert.equal(filtered.body.total, 1);

  const audit = await api(baseUrl, `/api/cases/${caseId}/audit`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  assert.equal(audit.response.status, 200);
  assert.ok(audit.body.items.some((entry) => entry.action === "document.generated"));

  const packageResponse = await fetch(`${baseUrl}/api/cases/${caseId}/package`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  assert.equal(packageResponse.status, 200);
  assert.ok((await packageResponse.text()).includes("Пакет дела"));

  const packageZip = await fetch(`${baseUrl}/api/cases/${caseId}/package?format=zip`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  assert.equal(packageZip.status, 200);
  assert.equal(Buffer.from(await packageZip.arrayBuffer()).subarray(0, 2).toString("utf8"), "PK");

  const admin = await api(baseUrl, "/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: "admin@problemos.local", password: "admin123" })
  });
  const adminUsers = await api(baseUrl, "/api/admin/users", {
    headers: { Authorization: `Bearer ${admin.body.token}` }
  });
  assert.equal(adminUsers.response.status, 200);
  assert.ok(adminUsers.body.items.some((item) => item.email === "user@example.test"));

  const adminCases = await api(baseUrl, "/api/admin/cases?status=escalation", {
    headers: { Authorization: `Bearer ${admin.body.token}` }
  });
  assert.equal(adminCases.response.status, 200);
  assert.equal(adminCases.body.total, 1);

  const diagnostics = await api(baseUrl, "/api/diagnostics", {
    headers: { Authorization: `Bearer ${admin.body.token}` }
  });
  assert.equal(diagnostics.response.status, 200);
  assert.ok(diagnostics.body.counts.cases >= 1);

  const scheduler = await api(baseUrl, "/api/admin/scheduler/run", {
    method: "POST",
    headers: { Authorization: `Bearer ${admin.body.token}` },
    body: JSON.stringify({})
  });
  assert.equal(scheduler.response.status, 200);
  assert.ok(scheduler.body.scannedCases >= 1);

  const dispatch = await api(baseUrl, "/api/admin/notifications/dispatch", {
    method: "POST",
    headers: { Authorization: `Bearer ${admin.body.token}` },
    body: JSON.stringify({ dryRun: true })
  });
  assert.equal(dispatch.response.status, 200);
  assert.ok(dispatch.body.attempted.length >= 1);

  const exported = await fetch(`${baseUrl}/api/admin/export`, {
    headers: { Authorization: `Bearer ${admin.body.token}` }
  });
  assert.equal(exported.status, 200);
  assert.ok((await exported.text()).includes("user@example.test"));

  const backup = await api(baseUrl, "/api/admin/backup", {
    method: "POST",
    headers: { Authorization: `Bearer ${admin.body.token}` },
    body: JSON.stringify({})
  });
  assert.equal(backup.response.status, 201);
  assert.ok(backup.body.backupFile.includes("problem-os-"));
});

test("users cannot read other users cases", async (t) => {
  const { server, baseUrl } = await startTestServer();
  t.after(() => server.close());

  const first = await api(baseUrl, "/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email: "first@example.test", password: "secret123", fullName: "First" })
  });
  const second = await api(baseUrl, "/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email: "second@example.test", password: "secret123", fullName: "Second" })
  });

  const created = await api(baseUrl, "/api/cases", {
    method: "POST",
    headers: { Authorization: `Bearer ${first.body.token}` },
    body: JSON.stringify({ description: "УК не чинит лифт" })
  });

  const forbidden = await api(baseUrl, `/api/cases/${created.body.item.id}`, {
    headers: { Authorization: `Bearer ${second.body.token}` }
  });

  assert.equal(forbidden.response.status, 403);
});

test("telegram link and webhook can create a case", async (t) => {
  const { server, baseUrl } = await startTestServer();
  t.after(() => server.close());

  const registered = await api(baseUrl, "/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email: "telegram@example.test", password: "secret123", fullName: "Telegram User" })
  });

  const linked = await api(baseUrl, "/api/telegram/link", {
    method: "POST",
    headers: { Authorization: `Bearer ${registered.body.token}` },
    body: JSON.stringify({ telegramId: "1001" })
  });
  assert.equal(linked.response.status, 200);

  const createdByBot = await api(baseUrl, "/api/telegram/webhook", {
    method: "POST",
    body: JSON.stringify({
      message: {
        text: "/newcase УК не чинит лифт",
        from: { id: 1001 },
        chat: { id: 1001 }
      }
    })
  });

  assert.equal(createdByBot.response.status, 200);
  assert.equal(createdByBot.body.ok, true);
  assert.ok(createdByBot.body.caseId);

  const next = await api(baseUrl, "/api/telegram/webhook", {
    method: "POST",
    body: JSON.stringify({
      message: {
        text: "/next",
        from: { id: 1001 },
        chat: { id: 1001 }
      }
    })
  });

  assert.equal(next.response.status, 200);
  assert.ok(next.body.text.includes("Дело:"));

  const audit = await api(baseUrl, `/api/cases/${createdByBot.body.caseId}/audit`, {
    headers: { Authorization: `Bearer ${registered.body.token}` }
  });
  assert.equal(audit.response.status, 200);
  assert.ok(audit.body.items.some((entry) => entry.action === "case.created.telegram"));
});

test("rate limiter can reject excessive api requests", async (t) => {
  const { server, baseUrl } = await startTestServer({
    rateLimit: { windowMs: 60_000, apiLimit: 2, authLimit: 2 }
  });
  t.after(() => server.close());

  assert.equal((await fetch(`${baseUrl}/api/categories`)).status, 200);
  assert.equal((await fetch(`${baseUrl}/api/categories`)).status, 200);
  assert.equal((await fetch(`${baseUrl}/api/categories`)).status, 429);
});
