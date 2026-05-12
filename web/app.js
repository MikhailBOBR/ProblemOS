const app = document.querySelector("#app");

const state = {
  token: localStorage.getItem("problemos.token") || "",
  user: JSON.parse(localStorage.getItem("problemos.user") || "null"),
  view: "dashboard",
  categories: [],
  statuses: [],
  cases: [],
  notifications: [],
  selectedCaseId: "",
  analysis: null,
  authMode: "login",
  newCaseDraft: { description: "", categoryId: "", facts: {} },
  adminStats: null,
  templates: []
};

const statusTone = {
  draft: "muted",
  fact_collection: "warning",
  evidence_collection: "warning",
  document_ready: "success",
  sent: "info",
  waiting_response: "info",
  deadline_missed: "danger",
  escalation: "danger",
  closed: "muted"
};

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value) {
  if (!value) return "не указан";
  return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function getStatus(status) {
  return state.statuses.find((item) => item.id === status) || { label: status, tone: statusTone[status] || "muted" };
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}),
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

function setSession(payload) {
  state.token = payload.token;
  state.user = payload.user;
  localStorage.setItem("problemos.token", state.token);
  localStorage.setItem("problemos.user", JSON.stringify(state.user));
}

function clearSession() {
  state.token = "";
  state.user = null;
  localStorage.removeItem("problemos.token");
  localStorage.removeItem("problemos.user");
}

async function loadBase() {
  const categories = await api("/api/categories");
  state.categories = categories.items;
  state.statuses = categories.statuses;
}

async function loadCases() {
  const payload = await api("/api/cases");
  state.cases = payload.items;
}

async function loadNotifications() {
  const payload = await api("/api/notifications");
  state.notifications = payload.items;
}

async function loadAdmin() {
  if (state.user?.role !== "admin") return;
  state.adminStats = await api("/api/admin/stats");
  const templates = await api("/api/admin/templates");
  state.templates = templates.items;
}

async function bootstrap() {
  try {
    await loadBase();
    if (state.token) {
      const me = await api("/api/me");
      state.user = me.user;
      localStorage.setItem("problemos.user", JSON.stringify(state.user));
      await Promise.all([loadCases(), loadNotifications(), loadAdmin()]);
    }
  } catch (error) {
    clearSession();
  }
  render();
}

function render() {
  if (!state.user) {
    renderAuth();
    return;
  }

  app.innerHTML = `
    <div class="shell">
      <aside class="sidebar">
        <div class="brand">
          <div class="brand-mark">P</div>
          <div>
            <div class="brand-title">ProblemOS</div>
            <div class="brand-subtitle">система ведения дел</div>
          </div>
        </div>
        <nav class="nav">
          ${navButton("dashboard", "Панель")}
          ${navButton("cases", "Мои дела")}
          ${navButton("new", "Создать дело")}
          ${navButton("documents", "Документы")}
          ${state.user.role === "admin" ? navButton("admin", "Админка") : ""}
        </nav>
        <div class="sidebar-footer">
          Главная команда продукта: пользователь всегда должен понимать, что делать дальше.
        </div>
      </aside>
      <main class="main">
        ${renderTopbar()}
        <div id="view">${renderView()}</div>
      </main>
    </div>
  `;
  bindShellEvents();
  bindViewEvents();
}

function navButton(view, label) {
  return `<button class="${state.view === view ? "active" : ""}" data-view="${view}">${label}</button>`;
}

function renderTopbar() {
  const titles = {
    dashboard: ["Рабочая панель", "Активные дела, дедлайны и быстрые действия."],
    cases: ["Мои дела", "Все бытовые проблемы в виде управляемых дел."],
    new: ["Создать дело", "Опишите ситуацию обычными словами, система соберет структуру."],
    documents: ["Документы", "Сформированные претензии, заявления и пакеты дел."],
    admin: ["Админка", "Шаблоны, статистика и операционное управление."]
  };
  const [title, note] = titles[state.view] || titles.dashboard;

  return `
    <header class="topbar">
      <div>
        <h1 class="page-title">${title}</h1>
        <p class="page-note">${note}</p>
      </div>
      <div class="user-box">
        <span class="status ${state.user.role === "admin" ? "success" : "muted"}">${escapeHtml(state.user.role)}</span>
        <span>${escapeHtml(state.user.fullName || state.user.email)}</span>
        <button class="btn ghost" data-action="logout">Выйти</button>
      </div>
    </header>
  `;
}

function renderView() {
  if (state.view === "cases") return renderCases();
  if (state.view === "new") return renderNewCase();
  if (state.view === "documents") return renderDocuments();
  if (state.view === "admin") return renderAdmin();
  return renderDashboard();
}

function renderAuth() {
  const isRegister = state.authMode === "register";
  app.innerHTML = `
    <main class="auth-screen">
      <section class="auth-card">
        <h1>ProblemOS</h1>
        <p>${isRegister ? "Создайте аккаунт, чтобы начать вести первое дело." : "Войдите в кабинет, чтобы вести дела, документы и сроки."}</p>
        <form class="form" id="auth-form">
          ${
            isRegister
              ? `
                <div class="field">
                  <label>ФИО</label>
                  <input name="fullName" autocomplete="name" placeholder="Иван Иванов" required />
                </div>
              `
              : ""
          }
          <div class="field">
            <label>Email</label>
            <input name="email" type="email" value="${isRegister ? "" : "demo@problemos.local"}" autocomplete="email" required />
          </div>
          <div class="field">
            <label>Пароль</label>
            <input name="password" type="password" value="${isRegister ? "" : "demo123"}" autocomplete="${isRegister ? "new-password" : "current-password"}" required />
          </div>
          <div class="toolbar">
            <button class="btn primary" type="submit">${isRegister ? "Создать аккаунт" : "Войти"}</button>
            <button class="btn ghost" type="button" data-auth-mode="${isRegister ? "login" : "register"}">${isRegister ? "У меня уже есть аккаунт" : "Регистрация"}</button>
            ${isRegister ? "" : `<button class="btn ghost" type="button" data-auth="admin">Войти админом</button>`}
          </div>
          <div class="notice">Демо: demo@problemos.local / demo123. Админ: admin@problemos.local / admin123.</div>
          <div class="hint danger-text" id="auth-error"></div>
        </form>
      </section>
    </main>
  `;

  document.querySelector("#auth-form").addEventListener("submit", onAuthSubmit);
  document.querySelector("[data-auth-mode]")?.addEventListener("click", (event) => {
    state.authMode = event.currentTarget.dataset.authMode;
    renderAuth();
  });
  document.querySelector("[data-auth='admin']")?.addEventListener("click", async () => {
    document.querySelector("[name='email']").value = "admin@problemos.local";
    document.querySelector("[name='password']").value = "admin123";
  });
}

async function onAuthSubmit(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const error = document.querySelector("#auth-error");
  error.textContent = "";

  try {
    const payload = await api(state.authMode === "register" ? "/api/auth/register" : "/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: form.get("email"),
        password: form.get("password"),
        fullName: form.get("fullName")
      })
    });
    setSession(payload);
    await Promise.all([loadCases(), loadNotifications(), loadAdmin()]);
    render();
  } catch (err) {
    error.textContent = err.message;
  }
}

function renderDashboard() {
  const activeCases = state.cases.filter((item) => item.status !== "closed");
  const actionCases = state.cases.filter((item) => ["fact_collection", "evidence_collection", "deadline_missed", "escalation"].includes(item.status));
  const docsCount = state.cases.reduce((sum, item) => sum + (item.documents?.length || 0), 0);

  return `
    <section class="grid cols-3">
      ${metric("Активные дела", activeCases.length)}
      ${metric("Нужны действия", actionCases.length)}
      ${metric("Документы", docsCount)}
    </section>
    <section class="split" style="margin-top:16px">
      <div class="panel">
        <h2 class="section-title">Что делать дальше</h2>
        <div class="case-list">
          ${
            actionCases.length
              ? actionCases.slice(0, 4).map(renderCaseCard).join("")
              : `<div class="notice">Сейчас нет срочных действий. Можно создать новое дело или проверить дедлайны.</div>`
          }
        </div>
      </div>
      <div class="panel">
        <h2 class="section-title">Уведомления</h2>
        <div class="timeline">
          ${
            state.notifications.length
              ? state.notifications.slice(0, 6).map((item) => `
                <div class="line-item ${item.isRead ? "" : "active"}">
                  <div class="line-title">${escapeHtml(item.title)}</div>
                  <div class="line-subtitle">${escapeHtml(item.message)}</div>
                </div>
              `).join("")
              : `<div class="hint">Уведомлений пока нет.</div>`
          }
        </div>
      </div>
    </section>
  `;
}

function metric(label, value) {
  return `
    <div class="panel metric">
      <div class="metric-label">${label}</div>
      <div class="metric-value">${value}</div>
    </div>
  `;
}

function renderCases() {
  const selected = state.cases.find((item) => item.id === state.selectedCaseId);
  if (selected) {
    return renderCaseDetails(selected);
  }

  return `
    <div class="toolbar" style="margin-bottom:16px">
      <button class="btn primary" data-view="new">Создать дело</button>
      <button class="btn ghost" data-action="refresh">Обновить</button>
    </div>
    <section class="case-list">
      ${state.cases.length ? state.cases.map(renderCaseCard).join("") : `<div class="panel">Дел пока нет.</div>`}
    </section>
  `;
}

function renderCaseCard(item) {
  const status = getStatus(item.status);
  return `
    <article class="case-card">
      <div class="case-head">
        <div>
          <h3 class="case-title">${escapeHtml(item.title)}</h3>
          <p class="case-description">${escapeHtml(item.description || item.category.description)}</p>
        </div>
        <span class="status ${status.tone || statusTone[item.status] || "muted"}">${escapeHtml(status.label)}</span>
      </div>
      <div class="progress"><span style="width:${item.progress?.percent || 0}%"></span></div>
      <div class="hint">Следующее действие: ${escapeHtml(item.nextAction)}</div>
      <div class="toolbar">
        <button class="btn primary" data-open-case="${item.id}">Открыть дело</button>
        <button class="btn warning" data-next-case="${item.id}">Что делать дальше?</button>
      </div>
    </article>
  `;
}

function renderCaseDetails(item) {
  const status = getStatus(item.status);
  const category = item.category || state.categories.find((categoryItem) => categoryItem.id === item.categoryId);

  return `
    <div class="toolbar" style="margin-bottom:16px">
      <button class="btn ghost" data-action="back-to-cases">Назад</button>
      <a class="btn ghost" href="/api/cases/${item.id}/package" data-download-package="${item.id}">Скачать пакет дела</a>
      <button class="btn primary" data-generate-doc="${item.id}">Сформировать документ</button>
    </div>
    <section class="split">
      <div class="grid">
        <div class="panel">
          <div class="case-head">
            <div>
              <h2 class="section-title">${escapeHtml(item.title)}</h2>
              <p class="case-description">${escapeHtml(item.description)}</p>
            </div>
            <span class="status ${status.tone || "muted"}">${escapeHtml(status.label)}</span>
          </div>
          <div class="notice" style="margin-top:14px">${escapeHtml(item.nextAction)}</div>
        </div>
        <div class="panel">
          <h2 class="section-title">Доказательства</h2>
          <form class="form" id="evidence-form" data-case-id="${item.id}">
            <div class="grid cols-2">
              <div class="field">
                <label>Тип доказательства</label>
                <select name="evidenceType">
                  ${category.requiredEvidence.map((evidence) => `<option value="${evidence.id}">${escapeHtml(evidence.label)}</option>`).join("")}
                </select>
              </div>
              <div class="field">
                <label>Файл</label>
                <input name="file" type="file" />
              </div>
            </div>
            <div class="field">
              <label>Название</label>
              <input name="title" placeholder="Например: фото потолка" />
            </div>
            <div class="field">
              <label>Комментарий</label>
              <input name="description" placeholder="Когда и где это зафиксировано" />
            </div>
            <button class="btn primary" type="submit">Загрузить доказательство</button>
          </form>
          <div class="evidence-grid" style="margin-top:14px">
            ${
              item.evidence?.length
                ? item.evidence.map((evidence) => `
                  <div class="evidence-card">
                    <div class="line-title">${escapeHtml(evidence.title)}</div>
                    <div class="line-subtitle">${escapeHtml(evidence.fileName)}</div>
                    <div class="hint">${escapeHtml(evidence.description || "")}</div>
                  </div>
                `).join("")
                : `<div class="hint">Пока ничего не загружено.</div>`
            }
          </div>
        </div>
        <div class="panel">
          <h2 class="section-title">Документы</h2>
          ${
            item.documents?.length
              ? item.documents.map((doc) => `
                <div class="case-card">
                  <div class="case-head">
                    <div>
                      <div class="line-title">${escapeHtml(doc.title)}</div>
                      <div class="line-subtitle">${formatDate(doc.createdAt)}</div>
                    </div>
                    <a class="btn ghost" href="/api/documents/${doc.id}/download" data-download-doc="${doc.id}">Скачать RTF</a>
                  </div>
                  <pre class="document-preview">${escapeHtml(doc.content)}</pre>
                </div>
              `).join("")
              : `<div class="hint">Документы еще не сформированы.</div>`
          }
        </div>
      </div>
      <aside class="grid">
        <div class="panel">
          <h2 class="section-title">Маршрут</h2>
          <div class="steps">
            ${item.steps.map((step) => `
              <div class="line-item ${step.status}">
                <div class="line-title">${step.order}. ${escapeHtml(step.title)}</div>
                <div class="line-subtitle">${escapeHtml(step.status)}</div>
              </div>
            `).join("")}
          </div>
        </div>
        <div class="panel">
          <h2 class="section-title">Факты</h2>
          <div class="facts">
            ${
              Object.keys(item.facts || {}).length
                ? Object.entries(item.facts).map(([key, value]) => `
                  <div class="line-item">
                    <div class="line-title">${escapeHtml(key)}</div>
                    <div class="line-subtitle">${escapeHtml(value)}</div>
                  </div>
                `).join("")
                : `<div class="hint">Факты пока не заполнены.</div>`
            }
          </div>
        </div>
        <div class="panel">
          <h2 class="section-title">Хронология</h2>
          <div class="timeline">
            ${item.timeline.map((event) => `
              <div class="line-item">
                <div class="line-title">${formatDate(event.at)} - ${escapeHtml(event.title)}</div>
                <div class="line-subtitle">${escapeHtml(event.description)}</div>
              </div>
            `).join("")}
          </div>
        </div>
      </aside>
    </section>
  `;
}

function renderNewCase() {
  const selectedCategoryId = state.newCaseDraft.categoryId || state.analysis?.categoryId || state.categories[0]?.id;
  const selectedCategory = state.categories.find((item) => item.id === selectedCategoryId) || state.categories[0];

  return `
    <section class="split">
      <div class="panel">
        <form class="form" id="new-case-form">
          <div class="field">
            <label>Опишите проблему</label>
            <textarea name="description" placeholder="Например: Купил телефон, через 5 дней он перестал включаться, магазин не возвращает деньги" required>${escapeHtml(state.newCaseDraft.description)}</textarea>
          </div>
          <div class="toolbar">
            <button class="btn ghost" type="button" data-action="analyze">Определить категорию</button>
          </div>
          <div class="field">
            <label>Категория</label>
            <select name="categoryId" id="category-select">
              ${state.categories.map((category) => `<option value="${category.id}" ${category.id === selectedCategoryId ? "selected" : ""}>${escapeHtml(category.name)}</option>`).join("")}
            </select>
          </div>
          <div class="grid cols-2" id="category-questions">
            ${(selectedCategory?.questions || []).map((question) => `
              <div class="field">
                <label>${escapeHtml(question.label)}</label>
                <input name="fact:${question.id}" placeholder="${escapeHtml(question.placeholder)}" value="${escapeHtml(state.newCaseDraft.facts?.[question.id] || state.analysis?.facts?.[question.id] || "")}" />
              </div>
            `).join("")}
          </div>
          <button class="btn primary" type="submit">Создать дело</button>
          <div class="hint danger-text" id="new-case-error"></div>
        </form>
      </div>
      <aside class="panel">
        <h2 class="section-title">AI-разбор</h2>
        ${
          state.analysis
            ? `
              <div class="timeline">
                <div class="line-item active">
                  <div class="line-title">Категория</div>
                  <div class="line-subtitle">${escapeHtml(state.analysis.categoryName)} (${Math.round(state.analysis.confidence * 100)}%)</div>
                </div>
                <div class="line-item">
                  <div class="line-title">Цель</div>
                  <div class="line-subtitle">${escapeHtml(state.analysis.goal)}</div>
                </div>
                <div class="line-item">
                  <div class="line-title">Чего не хватает</div>
                  <div class="line-subtitle">${escapeHtml(state.analysis.missingFields.map((item) => item.label).join(", ") || "Основные факты заполнены")}</div>
                </div>
              </div>
            `
            : `<div class="notice">Нажмите "Определить категорию", чтобы система подсказала сценарий и недостающие факты.</div>`
        }
      </aside>
    </section>
  `;
}

function renderDocuments() {
  const documents = state.cases.flatMap((item) => (item.documents || []).map((document) => ({ ...document, caseTitle: item.title })));

  return `
    <section class="case-list">
      ${
        documents.length
          ? documents.map((doc) => `
            <article class="case-card">
              <div class="case-head">
                <div>
                  <h3 class="case-title">${escapeHtml(doc.title)}</h3>
                  <p class="case-description">${escapeHtml(doc.caseTitle)} - ${formatDate(doc.createdAt)}</p>
                </div>
                <a class="btn ghost" href="/api/documents/${doc.id}/download" data-download-doc="${doc.id}">Скачать RTF</a>
              </div>
            </article>
          `).join("")
          : `<div class="panel">Документов пока нет. Откройте дело и сформируйте документ.</div>`
      }
    </section>
  `;
}

function renderAdmin() {
  if (state.user.role !== "admin") {
    return `<div class="panel">Нет доступа.</div>`;
  }

  const stats = state.adminStats || {};

  return `
    <section class="grid cols-3">
      ${metric("Пользователи", stats.users || 0)}
      ${metric("Дела", stats.cases || 0)}
      ${metric("Документы", stats.documents || 0)}
    </section>
    <section class="panel" style="margin-top:16px">
      <h2 class="section-title">Шаблоны документов</h2>
      <div class="grid">
        ${state.templates.map((template) => `
          <form class="form admin-template" data-template-id="${template.id}">
            <div class="grid cols-2">
              <div class="field">
                <label>Название</label>
                <input name="title" value="${escapeHtml(template.title)}" />
              </div>
              <div class="field">
                <label>Активен</label>
                <select name="isActive">
                  <option value="true" ${template.isActive ? "selected" : ""}>Да</option>
                  <option value="false" ${!template.isActive ? "selected" : ""}>Нет</option>
                </select>
              </div>
            </div>
            <div class="field">
              <label>Текст шаблона</label>
              <textarea name="body">${escapeHtml(template.body)}</textarea>
            </div>
            <button class="btn primary" type="submit">Сохранить шаблон</button>
          </form>
        `).join("")}
      </div>
    </section>
  `;
}

function bindShellEvents() {
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => {
      state.view = button.dataset.view;
      state.selectedCaseId = "";
      render();
    });
  });

  document.querySelector("[data-action='logout']")?.addEventListener("click", () => {
    clearSession();
    render();
  });
}

function bindViewEvents() {
  document.querySelector("[data-action='refresh']")?.addEventListener("click", refreshAll);
  document.querySelector("[data-action='back-to-cases']")?.addEventListener("click", () => {
    state.selectedCaseId = "";
    render();
  });

  document.querySelectorAll("[data-open-case]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedCaseId = button.dataset.openCase;
      state.view = "cases";
      render();
    });
  });

  document.querySelectorAll("[data-next-case]").forEach((button) => {
    button.addEventListener("click", () => {
      const item = state.cases.find((problemCase) => problemCase.id === button.dataset.nextCase);
      alert(item?.nextAction || "Следующий шаг не найден");
    });
  });

  document.querySelector("[data-action='analyze']")?.addEventListener("click", analyzeNewCase);
  document.querySelector("#new-case-form")?.addEventListener("submit", createCase);
  document.querySelector("#category-select")?.addEventListener("change", () => {
    collectNewCaseDraft();
    state.newCaseDraft.categoryId = document.querySelector("#category-select").value;
    state.analysis = { ...(state.analysis || {}), categoryId: state.newCaseDraft.categoryId, facts: state.analysis?.facts || {} };
    render();
  });
  document.querySelector("#evidence-form")?.addEventListener("submit", uploadEvidence);

  document.querySelectorAll("[data-generate-doc]").forEach((button) => {
    button.addEventListener("click", async () => {
      await api(`/api/cases/${button.dataset.generateDoc}/documents/generate`, {
        method: "POST",
        body: JSON.stringify({})
      });
      await refreshAll();
    });
  });

  document.querySelectorAll("[data-download-doc], [data-download-package]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      downloadWithToken(link.href);
    });
  });

  document.querySelectorAll("[data-template-id]").forEach((form) => {
    form.addEventListener("submit", saveTemplate);
  });
}

async function refreshAll() {
  await Promise.all([loadCases(), loadNotifications(), loadAdmin()]);
  render();
}

async function analyzeNewCase() {
  collectNewCaseDraft();
  const description = state.newCaseDraft.description;
  state.analysis = await api("/api/ai/analyze", {
    method: "POST",
    body: JSON.stringify({ text: description })
  });
  state.newCaseDraft.categoryId = state.analysis.categoryId;
  render();
}

function collectNewCaseDraft() {
  const form = document.querySelector("#new-case-form");
  if (!form) return;

  const data = new FormData(form);
  const facts = {};
  for (const [key, value] of data.entries()) {
    if (key.startsWith("fact:") && value) {
      facts[key.replace("fact:", "")] = value;
    }
  }

  state.newCaseDraft = {
    description: data.get("description") || "",
    categoryId: data.get("categoryId") || state.newCaseDraft.categoryId,
    facts
  };
}

async function createCase(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const facts = {};
  for (const [key, value] of form.entries()) {
    if (key.startsWith("fact:") && value) {
      facts[key.replace("fact:", "")] = value;
    }
  }

  try {
    const payload = await api("/api/cases", {
      method: "POST",
      body: JSON.stringify({
        description: form.get("description"),
        categoryId: form.get("categoryId"),
        facts
      })
    });
    await refreshAll();
    state.view = "cases";
    state.selectedCaseId = payload.item.id;
    state.analysis = null;
    state.newCaseDraft = { description: "", categoryId: "", facts: {} };
    render();
  } catch (error) {
    document.querySelector("#new-case-error").textContent = error.message;
  }
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve("");
      return;
    }
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result));
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsDataURL(file);
  });
}

async function uploadEvidence(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const file = form.get("file");
  const fileData = file && file.size <= 700_000 ? await readFileAsDataUrl(file) : "";

  await api(`/api/cases/${event.currentTarget.dataset.caseId}/evidence`, {
    method: "POST",
    body: JSON.stringify({
      evidenceType: form.get("evidenceType"),
      title: form.get("title") || file?.name || "Доказательство",
      description: form.get("description"),
      fileName: file?.name || "",
      fileType: file?.type || "",
      fileSize: file?.size || 0,
      fileData
    })
  });

  await refreshAll();
}

async function saveTemplate(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  await api(`/api/admin/templates/${event.currentTarget.dataset.templateId}`, {
    method: "PATCH",
    body: JSON.stringify({
      title: form.get("title"),
      body: form.get("body"),
      isActive: form.get("isActive") === "true"
    })
  });
  await refreshAll();
}

async function downloadWithToken(url) {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${state.token}`
    }
  });
  const blob = await response.blob();
  const disposition = response.headers.get("content-disposition") || "";
  const fallback = url.includes("/package") ? "case-package.md" : "document.rtf";
  const match = disposition.match(/filename="(.+)"/);
  const fileName = match ? decodeURIComponent(match[1]) : fallback;
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

bootstrap();
