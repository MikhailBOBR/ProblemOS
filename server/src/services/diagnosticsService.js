import { stat } from "node:fs/promises";

async function safeStat(path) {
  try {
    return await stat(path);
  } catch {
    return null;
  }
}

export async function buildDiagnostics({ data, dataFile, uploadRoot, startedAt }) {
  const dataStat = await safeStat(dataFile);
  const uploadStat = await safeStat(uploadRoot);
  const memory = process.memoryUsage();

  return {
    service: "ProblemOS",
    time: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
    startedAt,
    node: process.version,
    platform: process.platform,
    storage: {
      dataFile,
      dataFileBytes: dataStat?.size ?? 0,
      uploadRoot,
      uploadRootExists: Boolean(uploadStat)
    },
    counts: {
      users: data.users.length,
      cases: data.cases.length,
      evidence: data.cases.reduce((sum, item) => sum + (item.evidence?.length ?? 0), 0),
      documents: data.generatedDocuments.length,
      notifications: data.notifications.length,
      auditLogs: data.auditLogs.length,
      comments: data.caseComments.length
    },
    memory: {
      rss: memory.rss,
      heapUsed: memory.heapUsed,
      heapTotal: memory.heapTotal
    }
  };
}
