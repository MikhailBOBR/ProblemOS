import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { createSeedData } from "./seed.js";

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

  for (const user of data.users) {
    user.phone = user.phone ?? "";
    user.telegramId = user.telegramId ?? "";
    user.role = user.role ?? "user";
    user.updatedAt = user.updatedAt ?? user.createdAt ?? new Date().toISOString();
  }

  for (const problemCase of data.cases) {
    problemCase.evidence = problemCase.evidence ?? [];
    problemCase.documents = problemCase.documents ?? [];
    problemCase.timeline = problemCase.timeline ?? [];
    problemCase.steps = problemCase.steps ?? [];
  }

  return data;
}

export class JsonStore {
  constructor(dataFile = join(process.cwd(), "server", "data", "problem-os.json")) {
    this.dataFile = dataFile;
    this.data = null;
    this.queue = Promise.resolve();
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
