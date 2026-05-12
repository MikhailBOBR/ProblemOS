import { once } from "node:events";
import { mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import assert from "node:assert/strict";
import { createProblemOsServer } from "../src/index.js";

async function startTestServer() {
  const dir = await mkdtemp(join(tmpdir(), "problemos-"));
  const server = createProblemOsServer({ dataFile: join(dir, "data.json"), staticRoot: join(process.cwd(), "web") });
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
      fileSize: 1200
    })
  });

  assert.equal(evidence.response.status, 201);
  assert.equal(evidence.body.item.title, "Чек");

  const generated = await api(baseUrl, `/api/cases/${caseId}/documents/generate`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({})
  });

  assert.equal(generated.response.status, 201);
  assert.ok(generated.body.item.content.includes("ПРЕТЕНЗИЯ"));

  const list = await api(baseUrl, "/api/cases", {
    headers: { Authorization: `Bearer ${token}` }
  });

  assert.equal(list.body.items.length, 1);
  assert.equal(list.body.items[0].documents.length, 1);

  const packageResponse = await fetch(`${baseUrl}/api/cases/${caseId}/package`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  assert.equal(packageResponse.status, 200);
  assert.ok((await packageResponse.text()).includes("Пакет дела"));
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
