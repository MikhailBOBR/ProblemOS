import { Readable } from "node:stream";
import test from "node:test";
import assert from "node:assert/strict";
import { readJsonObject } from "../src/http/validation.js";
import {
  parseCaseUpdateRequest,
  parseEvidenceUploadRequest,
  parseRegisterRequest,
  parseTemplateRestoreRequest
} from "../src/dto/requestDtos.js";

function jsonRequest(payload) {
  return Readable.from([Buffer.from(JSON.stringify(payload), "utf8")]);
}

test("readJsonObject rejects non-object request payloads", async () => {
  await assert.rejects(() => readJsonObject(jsonRequest([])), /JSON body must be an object/);
});

test("request DTOs normalize accepted payloads", async () => {
  const register = await parseRegisterRequest(jsonRequest({ email: " USER@Example.TEST ", password: "secret123", fullName: " User " }));
  assert.deepEqual(register, { email: "user@example.test", password: "secret123", fullName: "User" });

  const update = await parseCaseUpdateRequest(jsonRequest({ title: "  New title  ", facts: { product: "phone" } }));
  assert.deepEqual(update, { title: "New title", facts: { product: "phone" } });

  const evidence = await parseEvidenceUploadRequest(jsonRequest({ title: " Receipt ", fileSize: "42" }));
  assert.equal(evidence.fileSize, 42);
  assert.equal(evidence.title, "Receipt");
});

test("request DTOs reject missing required fields", async () => {
  await assert.rejects(() => parseRegisterRequest(jsonRequest({ email: "x@example.test", password: "123" })), /password is required/);
  await assert.rejects(() => parseTemplateRestoreRequest(jsonRequest({})), /versionId is required/);
});
