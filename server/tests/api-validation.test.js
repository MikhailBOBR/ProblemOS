import { once } from "node:events";
import { mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import assert from "node:assert/strict";
import { createProblemOsServer } from "../src/index.js";

async function startTestServer(options = {}) {
  const dir = await mkdtemp(join(tmpdir(), "problemos-validation-"));
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
  return { server, baseUrl: `http://127.0.0.1:${address.port}` };
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
  return { response, body: text ? JSON.parse(text) : null };
}

test("api rejects malformed DTO payloads before route logic runs", async (t) => {
  const { server, baseUrl } = await startTestServer();
  t.after(() => server.close());

  const arrayBody = await api(baseUrl, "/api/auth/register", {
    method: "POST",
    body: JSON.stringify([])
  });
  assert.equal(arrayBody.response.status, 400);
  assert.match(arrayBody.body.error, /JSON body must be an object/);

  const registered = await api(baseUrl, "/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email: "valid@example.test", password: "secret123", fullName: "Valid" })
  });
  assert.equal(registered.response.status, 201);

  const invalidFacts = await api(baseUrl, "/api/cases", {
    method: "POST",
    headers: { Authorization: `Bearer ${registered.body.token}` },
    body: JSON.stringify({ description: "Broken phone", facts: ["not", "object"] })
  });
  assert.equal(invalidFacts.response.status, 400);
  assert.match(invalidFacts.body.error, /facts must be an object/);
});
