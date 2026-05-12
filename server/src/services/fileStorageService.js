import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, stat, writeFile } from "node:fs/promises";
import { basename, extname, join, resolve } from "node:path";

const MAX_FILE_BYTES = 8 * 1024 * 1024;

const MIME_EXTENSIONS = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "application/pdf": ".pdf",
  "text/plain": ".txt",
  "application/rtf": ".rtf",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "video/mp4": ".mp4"
};

const ALLOWED_MIME_TYPES = new Set(Object.keys(MIME_EXTENSIONS));

function createStorageError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.publicMessage = message;
  return error;
}

export function sanitizeFileName(fileName = "file") {
  const clean = basename(String(fileName))
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ")
    .trim();

  return clean || "file";
}

function parseDataUrl(fileData) {
  const match = String(fileData).match(/^data:([^;,]+)?(;base64)?,(.*)$/s);

  if (!match) {
    return {
      mimeType: "",
      buffer: Buffer.from(String(fileData), "base64")
    };
  }

  const [, mimeType, isBase64, raw] = match;
  return {
    mimeType: mimeType || "",
    buffer: isBase64 ? Buffer.from(raw, "base64") : Buffer.from(decodeURIComponent(raw), "utf8")
  };
}

function assertInsideRoot(uploadRoot, filePath) {
  const root = resolve(uploadRoot);
  const target = resolve(filePath);

  if (!target.startsWith(root)) {
    throw createStorageError(400, "Некорректный путь файла");
  }
}

export async function persistEvidenceFile({ uploadRoot, caseId, evidenceId, fileName, fileType, fileData }) {
  const safeName = sanitizeFileName(fileName || evidenceId);

  if (!fileData) {
    return {
      hasFile: false,
      originalName: safeName,
      storageKey: "",
      fileHash: "",
      fileSize: Number(0),
      fileType: fileType || "application/octet-stream"
    };
  }

  const { mimeType, buffer } = parseDataUrl(fileData);
  const effectiveType = fileType || mimeType || "application/octet-stream";

  if (!ALLOWED_MIME_TYPES.has(effectiveType)) {
    throw createStorageError(415, "Тип файла не поддерживается");
  }

  if (buffer.length > MAX_FILE_BYTES) {
    throw createStorageError(413, "Файл слишком большой");
  }

  const extension = extname(safeName) || MIME_EXTENSIONS[effectiveType] || ".bin";
  const storageName = `${evidenceId}${extension.toLowerCase()}`;
  const caseDir = join(uploadRoot, caseId);
  const absolutePath = join(caseDir, storageName);
  assertInsideRoot(uploadRoot, absolutePath);

  await mkdir(caseDir, { recursive: true });
  await writeFile(absolutePath, buffer);

  return {
    hasFile: true,
    originalName: safeName,
    storageKey: `${caseId}/${storageName}`,
    fileHash: createHash("sha256").update(buffer).digest("hex"),
    fileSize: buffer.length,
    fileType: effectiveType
  };
}

export function resolveEvidencePath(uploadRoot, evidence) {
  if (!evidence?.storageKey) {
    throw createStorageError(404, "Файл доказательства не сохранен");
  }

  const absolutePath = join(uploadRoot, evidence.storageKey);
  assertInsideRoot(uploadRoot, absolutePath);
  return absolutePath;
}

export async function openEvidenceFile(uploadRoot, evidence) {
  const absolutePath = resolveEvidencePath(uploadRoot, evidence);
  const fileStat = await stat(absolutePath);

  return {
    stream: createReadStream(absolutePath),
    size: fileStat.size,
    fileName: sanitizeFileName(evidence.fileName || evidence.title || evidence.id),
    fileType: evidence.fileType || "application/octet-stream"
  };
}
