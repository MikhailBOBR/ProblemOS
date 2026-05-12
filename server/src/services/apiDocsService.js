export function buildApiDocs() {
  return {
    openapi: "3.1.0",
    info: {
      title: "ProblemOS API",
      version: "0.2.0",
      description: "Self-contained API for cases, evidence, documents, notifications, experts and admin playbooks."
    },
    tags: ["auth", "cases", "documents", "experts", "admin", "telegram"],
    paths: {
      "/api/auth/register": { post: { tags: ["auth"], summary: "Register user and create session" } },
      "/api/auth/login": { post: { tags: ["auth"], summary: "Create session token" } },
      "/api/me": { get: { tags: ["auth"], summary: "Current user profile" } },
      "/api/categories": { get: { tags: ["cases"], summary: "Public categories and statuses" } },
      "/api/cases": {
        get: { tags: ["cases"], summary: "List visible cases" },
        post: { tags: ["cases"], summary: "Create a case from problem description" }
      },
      "/api/cases/{id}": {
        get: { tags: ["cases"], summary: "Get case details" },
        patch: { tags: ["cases"], summary: "Update case fields" }
      },
      "/api/cases/{id}/evidence": { post: { tags: ["cases"], summary: "Upload evidence metadata or file payload" } },
      "/api/cases/{id}/documents/generate": { post: { tags: ["documents"], summary: "Generate document from template" } },
      "/api/cases/{id}/recommendations": {
        get: { tags: ["experts"], summary: "List visible expert recommendations" },
        post: { tags: ["experts"], summary: "Create recommendation as assigned expert or admin" }
      },
      "/api/expert/cases": { get: { tags: ["experts"], summary: "List assigned expert cases" } },
      "/api/notifications": { get: { tags: ["cases"], summary: "List notifications and run deadline check for user" } },
      "/api/admin/users": { get: { tags: ["admin"], summary: "List users with case counts" } },
      "/api/admin/users/{id}/role": { patch: { tags: ["admin"], summary: "Change user role" } },
      "/api/admin/cases": { get: { tags: ["admin"], summary: "List all cases with owners" } },
      "/api/admin/cases/{id}/assign-expert": { patch: { tags: ["admin"], summary: "Assign or unassign case expert" } },
      "/api/admin/categories": { get: { tags: ["admin"], summary: "List editable category playbooks" } },
      "/api/admin/categories/{id}": { patch: { tags: ["admin"], summary: "Update category playbook" } },
      "/api/admin/templates": { get: { tags: ["admin"], summary: "List document templates" } },
      "/api/admin/templates/{id}": { patch: { tags: ["admin"], summary: "Update template and create version snapshot" } },
      "/api/admin/templates/{id}/versions": { get: { tags: ["admin"], summary: "List template version snapshots" } },
      "/api/admin/templates/{id}/restore": { post: { tags: ["admin"], summary: "Restore template from version snapshot" } }
    }
  };
}
