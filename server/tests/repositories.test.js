import test from "node:test";
import assert from "node:assert/strict";
import { createSeedData } from "../src/data/seed.js";
import { createCaseFromInput } from "../src/services/caseService.js";
import { createNotification } from "../src/services/notificationService.js";
import { createJsonRepositories } from "../src/repositories/jsonRepositories.js";

test("json repositories expose stable data access contracts", () => {
  const data = createSeedData();
  const repos = createJsonRepositories(data);

  const admin = repos.users.findByEmail("admin@problemos.local");
  assert.equal(admin.role, "admin");

  repos.sessions.create("token-test", admin.id, "2026-05-13T00:00:00.000Z");
  assert.equal(repos.users.findByToken("token-test").id, admin.id);

  const { problemCase } = createCaseFromInput(admin.id, { description: "Phone is broken after purchase" }, data.categories);
  repos.cases.create(problemCase);
  assert.equal(repos.cases.findById(problemCase.id).userId, admin.id);

  repos.cases.replace({ ...problemCase, title: "Updated repository title" });
  assert.equal(repos.cases.findById(problemCase.id).title, "Updated repository title");

  repos.cases.replace({
    ...repos.cases.findById(problemCase.id),
    evidence: [{ id: "evidence-test", title: "Receipt" }]
  });
  assert.equal(repos.cases.findByEvidenceId("evidence-test").problemCase.id, problemCase.id);

  assert.ok(repos.documentTemplates.listActiveByCategory("product_return").length >= 1);

  const notification = createNotification({
    userId: admin.id,
    caseId: problemCase.id,
    type: "test",
    title: "Repository notification",
    message: "ok"
  });
  repos.notifications.create(notification);
  assert.equal(repos.notifications.findForUser(notification.id, admin.id).id, notification.id);
});
