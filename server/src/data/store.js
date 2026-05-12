import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { createSeedData } from "./seed.js";
import { createId, nowIso } from "../utils/id.js";
import { hashPassword } from "../utils/security.js";

function normalizeData(data) {
  data.version = data.version ?? 1;
  data.users = data.users ?? [];
  data.sessions = data.sessions ?? {};
  data.categories = data.categories ?? [];
  data.cases = data.cases ?? [];
  data.documentTemplates = data.documentTemplates ?? [];
  data.generatedDocuments = data.generatedDocuments ?? [];
  data.notifications = data.notifications ?? [];
  data.botSessions = data.botSessions ?? [];
  data.auditLogs = data.auditLogs ?? [];
  data.caseComments = data.caseComments ?? [];
  data.expertRecommendations = data.expertRecommendations ?? [];
  data.documentTemplateVersions = data.documentTemplateVersions ?? [];

  if (!data.users.some((user) => user.email === "expert@problemos.local")) {
    const now = nowIso();
    data.users.push({
      id: createId("user"),
      email: "expert@problemos.local",
      passwordHash: hashPassword("expert123"),
      fullName: "ProblemOS Expert",
      phone: "",
      telegramId: "",
      role: "expert",
      createdAt: now,
      updatedAt: now
    });
  }

  for (const user of data.users) {
    user.phone = user.phone ?? "";
    user.telegramId = user.telegramId ?? "";
    user.role = user.role ?? "user";
    user.updatedAt = user.updatedAt ?? user.createdAt ?? new Date().toISOString();
  }

  for (const problemCase of data.cases) {
    problemCase.expertId = problemCase.expertId ?? "";
    problemCase.evidence = problemCase.evidence ?? [];
    problemCase.documents = problemCase.documents ?? [];
    problemCase.timeline = problemCase.timeline ?? [];
    problemCase.steps = problemCase.steps ?? [];
  }

  for (const template of data.documentTemplates) {
    template.version = template.version ?? 1;
    template.updatedAt = template.updatedAt ?? null;
    template.updatedBy = template.updatedBy ?? "";
  }

  for (const category of data.categories) {
    category.updatedAt = category.updatedAt ?? null;
    category.updatedBy = category.updatedBy ?? "";
  }

  for (const recommendation of data.expertRecommendations) {
    recommendation.visibility = recommendation.visibility ?? "user";
    recommendation.status = recommendation.status ?? "open";
    recommendation.updatedAt = recommendation.updatedAt ?? recommendation.createdAt ?? new Date().toISOString();
  }

  for (const notification of data.notifications) {
    notification.isRead = Boolean(notification.isRead);
    notification.readAt = notification.readAt ?? null;
    notification.channel = notification.channel ?? "in_app";
    notification.dedupeKey = notification.dedupeKey ?? "";
    notification.meta = notification.meta ?? {};
    notification.telegramStatus = notification.telegramStatus ?? "pending";
    notification.telegramDeliveredAt = notification.telegramDeliveredAt ?? null;
    notification.telegramError = notification.telegramError ?? "";
  }

  return data;
}

export class JsonStore {
  constructor(dataFile = join(process.cwd(), "server", "data", "problem-os.json")) {
    this.dataFile = dataFile;
    this.data = null;
    this.queue = Promise.resolve();
  }

  getDataFile() {
    return this.dataFile;
  }

  async load() {
    if (this.data) {
      return this.data;
    }

    await mkdir(dirname(this.dataFile), { recursive: true });

    try {
      const raw = await readFile(this.dataFile, "utf8");
      this.data = normalizeData(JSON.parse(raw));
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }
      this.data = normalizeData(createSeedData());
      await this.save();
    }

    return this.data;
  }

  async save() {
    await mkdir(dirname(this.dataFile), { recursive: true });
    const tmpFile = `${this.dataFile}.tmp`;
    await writeFile(tmpFile, JSON.stringify(this.data, null, 2), "utf8");
    await rename(tmpFile, this.dataFile);
  }

  async exportJson() {
    const data = await this.load();
    return JSON.stringify(data, null, 2);
  }

  async backup(backupRoot = join(dirname(this.dataFile), "backups")) {
    const data = await this.load();
    await mkdir(backupRoot, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupFile = join(backupRoot, `problem-os-${stamp}.json`);
    await writeFile(backupFile, JSON.stringify(data, null, 2), "utf8");
    return backupFile;
  }

  async read() {
    return this.load();
  }

  async mutate(mutator) {
    const run = async () => {
      const data = await this.load();
      const result = await mutator(data);
      await this.save();
      return result;
    };

    this.queue = this.queue.then(run, run);
    return this.queue;
  }
}
