export function buildApiDocs() {
  return {
    openapi: "3.1.0",
    info: {
      title: "ProblemOS API",
      version: "0.3.0",
      description: "Self-contained API for cases, evidence, documents, notifications, experts, Telegram and admin playbooks."
    },
    tags: [
      { name: "system", description: "Health, diagnostics, public metadata and AI helpers." },
      { name: "auth", description: "Registration, login and profile routes." },
      { name: "analytics", description: "Personal, expert and admin analytics." },
      { name: "cases", description: "Case lifecycle, workflow, comments and audit timeline." },
      { name: "evidence", description: "Evidence upload and secure file download." },
      { name: "documents", description: "Document generation, export and case packages." },
      { name: "notifications", description: "In-app notifications and read state." },
      { name: "experts", description: "Expert queue and recommendations." },
      { name: "telegram", description: "Telegram account linking, drafts and webhook." },
      { name: "admin-ops", description: "Admin operations, backups, exports, scheduler and migrations." },
      { name: "admin-users", description: "Admin user management." },
      { name: "admin-cases", description: "Admin case queue and expert assignment." },
      { name: "admin-categories", description: "Category playbook management." },
      { name: "admin-templates", description: "Document template and version management." }
    ],
    paths: {
      "/api/health": { get: { tags: ["system"], summary: "Service health check" } },
      "/api/openapi": { get: { tags: ["system"], summary: "OpenAPI document" } },
      "/api/diagnostics": { get: { tags: ["system"], summary: "Admin diagnostics snapshot" } },
      "/api/categories": { get: { tags: ["system"], summary: "Public categories and statuses" } },
      "/api/ai/analyze": { post: { tags: ["system"], summary: "Analyze problem text and extract first facts" } },

      "/api/auth/register": { post: { tags: ["auth"], summary: "Register user and create session" } },
      "/api/auth/login": { post: { tags: ["auth"], summary: "Create session token" } },
      "/api/me": { get: { tags: ["auth"], summary: "Current user profile" } },
      "/api/me/profile": { patch: { tags: ["auth"], summary: "Update current user profile" } },

      "/api/me/analytics": { get: { tags: ["analytics"], summary: "Personal case analytics" } },
      "/api/expert/analytics": { get: { tags: ["analytics"], summary: "Expert queue analytics" } },
      "/api/admin/analytics": { get: { tags: ["analytics"], summary: "Platform analytics dashboard data" } },

      "/api/cases": {
        get: { tags: ["cases"], summary: "List visible cases" },
        post: { tags: ["cases"], summary: "Create a case from problem description" }
      },
      "/api/cases/{id}": {
        get: { tags: ["cases"], summary: "Get case details" },
        patch: { tags: ["cases"], summary: "Update case fields" }
      },
      "/api/cases/{id}/actions": { post: { tags: ["cases"], summary: "Apply workflow action to case" } },
      "/api/cases/{id}/audit": { get: { tags: ["cases"], summary: "Get case audit log" } },
      "/api/cases/{id}/completeness": { get: { tags: ["cases"], summary: "Evaluate case completeness" } },
      "/api/cases/{id}/comments": {
        get: { tags: ["cases"], summary: "List case comments" },
        post: { tags: ["cases"], summary: "Add case comment" }
      },

      "/api/cases/{id}/evidence": { post: { tags: ["evidence"], summary: "Upload evidence metadata or file payload" } },
      "/api/evidence/{id}/download": { get: { tags: ["evidence"], summary: "Download evidence file" } },

      "/api/cases/{id}/documents": { get: { tags: ["documents"], summary: "List case documents and available templates" } },
      "/api/cases/{id}/documents/generate": { post: { tags: ["documents"], summary: "Generate document from template" } },
      "/api/cases/{id}/package": { get: { tags: ["documents"], summary: "Download case package as Markdown or ZIP" } },
      "/api/documents/{id}/download": { get: { tags: ["documents"], summary: "Download generated document export" } },

      "/api/notifications": { get: { tags: ["notifications"], summary: "List notifications and run deadline check for user" } },
      "/api/notifications/read-all": { patch: { tags: ["notifications"], summary: "Mark all user notifications as read" } },
      "/api/notifications/{id}/read": { patch: { tags: ["notifications"], summary: "Mark one notification as read" } },

      "/api/expert/cases": { get: { tags: ["experts"], summary: "List assigned expert cases" } },
      "/api/cases/{id}/recommendations": {
        get: { tags: ["experts"], summary: "List visible expert recommendations" },
        post: { tags: ["experts"], summary: "Create recommendation as assigned expert or admin" }
      },

      "/api/telegram/draft": { post: { tags: ["telegram"], summary: "Create Telegram bot draft from free text" } },
      "/api/telegram/link": { post: { tags: ["telegram"], summary: "Link Telegram ID to current user" } },
      "/api/telegram/webhook": { post: { tags: ["telegram"], summary: "Process Telegram webhook update" } },

      "/api/admin/stats": { get: { tags: ["admin-ops"], summary: "Admin statistics snapshot" } },
      "/api/admin/scheduler/run": { post: { tags: ["admin-ops"], summary: "Run deadline scheduler manually" } },
      "/api/admin/notifications/dispatch": { post: { tags: ["admin-ops"], summary: "Dispatch Telegram notifications or dry-run" } },
      "/api/admin/export": { get: { tags: ["admin-ops"], summary: "Export JSON data" } },
      "/api/admin/backup": { post: { tags: ["admin-ops"], summary: "Create JSON backup" } },
      "/api/admin/audit": { get: { tags: ["admin-ops"], summary: "List recent audit events" } },
      "/api/admin/migration/postgres": { get: { tags: ["admin-ops"], summary: "Download PostgreSQL migration SQL" } },
      "/api/admin/migrations/postgres": { get: { tags: ["admin-ops"], summary: "Download PostgreSQL migration SQL alias" } },

      "/api/admin/users": { get: { tags: ["admin-users"], summary: "List users with case counts" } },
      "/api/admin/users/{id}/role": { patch: { tags: ["admin-users"], summary: "Change user role" } },

      "/api/admin/cases": { get: { tags: ["admin-cases"], summary: "List all cases with owners" } },
      "/api/admin/cases/{id}/assign-expert": { patch: { tags: ["admin-cases"], summary: "Assign or unassign case expert" } },

      "/api/admin/categories": { get: { tags: ["admin-categories"], summary: "List editable category playbooks" } },
      "/api/admin/categories/{id}": { patch: { tags: ["admin-categories"], summary: "Update category playbook" } },

      "/api/admin/templates": { get: { tags: ["admin-templates"], summary: "List document templates" } },
      "/api/admin/templates/{id}": { patch: { tags: ["admin-templates"], summary: "Update template and create version snapshot" } },
      "/api/admin/templates/{id}/versions": { get: { tags: ["admin-templates"], summary: "List template version snapshots" } },
      "/api/admin/templates/{id}/restore": { post: { tags: ["admin-templates"], summary: "Restore template from version snapshot" } }
    }
  };
}
