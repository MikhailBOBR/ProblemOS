import { pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";
import { createId } from "./id.js";

const ITERATIONS = 100_000;
const KEY_LENGTH = 32;
const DIGEST = "sha256";

export function hashPassword(password, salt = randomBytes(16).toString("hex")) {
  const hash = pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(":")) {
    return false;
  }

  const [salt, originalHash] = storedHash.split(":");
  const candidate = hashPassword(password, salt).split(":")[1];
  const originalBuffer = Buffer.from(originalHash, "hex");
  const candidateBuffer = Buffer.from(candidate, "hex");

  return originalBuffer.length === candidateBuffer.length && timingSafeEqual(originalBuffer, candidateBuffer);
}

export function createSessionToken() {
  return createId("session");
}

export function sanitizeUser(user) {
  if (!user) {
    return null;
  }

  const { passwordHash, ...safeUser } = user;
  return safeUser;
}
