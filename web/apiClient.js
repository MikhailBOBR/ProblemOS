export function createApiClient({ getToken } = {}) {
  async function request(path, options = {}) {
    const token = getToken?.() || "";
    const response = await fetch(path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {})
      }
    });

    const contentType = response.headers.get("content-type") || "";
    const body = contentType.includes("application/json") ? await response.json() : await response.text();

    if (!response.ok) {
      throw new Error(body.error || body || "Ошибка запроса");
    }

    return body;
  }

  return {
    request,
    auth: {
      me: () => request("/api/me"),
      login: (payload) => request("/api/auth/login", { method: "POST", body: JSON.stringify(payload) }),
      register: (payload) => request("/api/auth/register", { method: "POST", body: JSON.stringify(payload) }),
      updateProfile: (payload) => request("/api/me/profile", { method: "PATCH", body: JSON.stringify(payload) })
    },
    system: {
      categories: () => request("/api/categories"),
      analyze: (text) => request("/api/ai/analyze", { method: "POST", body: JSON.stringify({ text }) }),
      diagnostics: () => request("/api/diagnostics")
    },
    cases: {
      list: () => request("/api/cases"),
      create: (payload) => request("/api/cases", { method: "POST", body: JSON.stringify(payload) }),
      action: (caseId, payload) => request(`/api/cases/${caseId}/actions`, { method: "POST", body: JSON.stringify(payload) }),
      addEvidence: (caseId, payload) => request(`/api/cases/${caseId}/evidence`, { method: "POST", body: JSON.stringify(payload) }),
      generateDocument: (caseId, payload) =>
        request(`/api/cases/${caseId}/documents/generate`, { method: "POST", body: JSON.stringify(payload) }),
      addComment: (caseId, payload) => request(`/api/cases/${caseId}/comments`, { method: "POST", body: JSON.stringify(payload) }),
      addRecommendation: (caseId, payload) =>
        request(`/api/cases/${caseId}/recommendations`, { method: "POST", body: JSON.stringify(payload) })
    },
    notifications: {
      list: () => request("/api/notifications"),
      read: (id) => request(`/api/notifications/${id}/read`, { method: "PATCH" }),
      readAll: () => request("/api/notifications/read-all", { method: "PATCH" })
    },
    analytics: {
      me: () => request("/api/me/analytics"),
      expert: () => request("/api/expert/analytics"),
      admin: () => request("/api/admin/analytics")
    },
    admin: {
      stats: () => request("/api/admin/stats"),
      templates: () => request("/api/admin/templates"),
      users: () => request("/api/admin/users"),
      cases: () => request("/api/admin/cases"),
      categories: () => request("/api/admin/categories"),
      schedulerRun: () => request("/api/admin/scheduler/run", { method: "POST", body: JSON.stringify({}) }),
      notificationDispatchDryRun: () =>
        request("/api/admin/notifications/dispatch", { method: "POST", body: JSON.stringify({ dryRun: true }) }),
      backup: () => request("/api/admin/backup", { method: "POST", body: JSON.stringify({}) }),
      updateTemplate: (templateId, payload) =>
        request(`/api/admin/templates/${templateId}`, { method: "PATCH", body: JSON.stringify(payload) }),
      updateUserRole: (userId, payload) => request(`/api/admin/users/${userId}/role`, { method: "PATCH", body: JSON.stringify(payload) }),
      assignExpert: (caseId, payload) =>
        request(`/api/admin/cases/${caseId}/assign-expert`, { method: "PATCH", body: JSON.stringify(payload) }),
      updateCategory: (categoryId, payload) =>
        request(`/api/admin/categories/${categoryId}`, { method: "PATCH", body: JSON.stringify(payload) })
    }
  };
}
