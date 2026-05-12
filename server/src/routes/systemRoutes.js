import { CATEGORIES } from "../domain/categories.js";
import { CASE_STATUS_META } from "../domain/statuses.js";
import { analyzeProblem } from "../services/aiService.js";
import { buildApiDocs } from "../services/apiDocsService.js";
import { buildDiagnostics } from "../services/diagnosticsService.js";
import { requireAdmin, requireUser } from "../http/requestContext.js";
import { parseTextRequest } from "../dto/requestDtos.js";
import { sendJson } from "../utils/http.js";

export async function handleSystemRoutes(req, res, store, { pathname, method, uploadRoot, startedAt }) {
  if (method === "GET" && pathname === "/api/health") {
    sendJson(res, 200, { ok: true, service: "ProblemOS", time: new Date().toISOString(), uptimeSeconds: Math.round(process.uptime()) });
    return true;
  }

  if (method === "GET" && pathname === "/api/openapi") {
    sendJson(res, 200, buildApiDocs());
    return true;
  }

  if (method === "GET" && pathname === "/api/diagnostics") {
    const { data, user } = await requireUser(req, store);
    requireAdmin(user);
    sendJson(res, 200, await buildDiagnostics({ data, dataFile: store.getDataFile(), uploadRoot, startedAt }));
    return true;
  }

  if (method === "GET" && pathname === "/api/categories") {
    const data = await store.read();
    sendJson(res, 200, { items: data.categories ?? CATEGORIES, statuses: CASE_STATUS_META });
    return true;
  }

  if (method === "POST" && pathname === "/api/ai/analyze") {
    const { text } = await parseTextRequest(req);
    sendJson(res, 200, analyzeProblem(text));
    return true;
  }

  return false;
}
