export function buildPostgresMigrationSql() {
  return `-- ProblemOS PostgreSQL migration draft
-- This script mirrors the current JSON-store model and is meant as a starting point
-- for moving the MVP to a relational database.

create extension if not exists pgcrypto;

create table if not exists users (
  id text primary key,
  email text not null unique,
  password_hash text not null,
  full_name text not null,
  phone text not null default '',
  telegram_id text not null default '',
  role text not null default 'user' check (role in ('user', 'admin', 'expert')),
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table if not exists sessions (
  token text primary key,
  user_id text not null references users(id) on delete cascade,
  created_at timestamptz not null
);

create table if not exists categories (
  id text primary key,
  name text not null,
  short_name text not null,
  icon text not null,
  description text not null,
  default_deadline_days integer not null,
  required_evidence jsonb not null default '[]',
  questions jsonb not null default '[]',
  route jsonb not null default '[]',
  updated_at timestamptz,
  updated_by text references users(id)
);

create table if not exists cases (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  expert_id text references users(id) on delete set null,
  title text not null,
  category_id text not null references categories(id),
  description text not null,
  facts jsonb not null default '{}',
  status text not null,
  priority text not null,
  next_action text not null,
  deadline_at timestamptz,
  result text not null default '',
  closed_at timestamptz,
  steps jsonb not null default '[]',
  timeline jsonb not null default '[]',
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table if not exists evidence (
  id text primary key,
  case_id text not null references cases(id) on delete cascade,
  evidence_type text not null default '',
  file_name text not null,
  file_type text not null,
  file_size bigint not null default 0,
  has_file boolean not null default false,
  storage_key text not null default '',
  file_hash text not null default '',
  download_url text not null default '',
  title text not null,
  description text not null default '',
  uploaded_at timestamptz not null
);

create table if not exists document_templates (
  id text primary key,
  category_id text not null references categories(id),
  title text not null,
  type text not null,
  is_active boolean not null default true,
  variables jsonb not null default '[]',
  body text not null,
  version integer not null default 1,
  updated_at timestamptz,
  updated_by text references users(id)
);

create table if not exists document_template_versions (
  id text primary key,
  template_id text not null references document_templates(id) on delete cascade,
  version integer not null,
  title text not null,
  body text not null,
  variables jsonb not null default '[]',
  is_active boolean not null,
  category_id text not null,
  type text not null,
  reason text not null,
  created_at timestamptz not null,
  created_by text references users(id)
);

create table if not exists generated_documents (
  id text primary key,
  case_id text not null references cases(id) on delete cascade,
  template_id text references document_templates(id),
  title text not null,
  content text not null,
  variables jsonb not null default '{}',
  created_at timestamptz not null
);

create table if not exists notifications (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  case_id text references cases(id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  channel text not null default 'in_app',
  is_read boolean not null default false,
  read_at timestamptz,
  send_at timestamptz not null,
  dedupe_key text not null default '',
  meta jsonb not null default '{}',
  telegram_status text not null default 'pending',
  telegram_delivered_at timestamptz,
  telegram_error text not null default '',
  created_at timestamptz
);

create table if not exists case_comments (
  id text primary key,
  case_id text not null references cases(id) on delete cascade,
  author_id text not null references users(id),
  text text not null,
  created_at timestamptz not null
);

create table if not exists expert_recommendations (
  id text primary key,
  case_id text not null references cases(id) on delete cascade,
  author_id text not null references users(id),
  text text not null,
  visibility text not null default 'user' check (visibility in ('user', 'internal')),
  status text not null default 'open' check (status in ('open', 'accepted', 'resolved', 'archived')),
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table if not exists audit_logs (
  id text primary key,
  actor_id text,
  case_id text references cases(id) on delete cascade,
  entity_type text not null,
  entity_id text,
  action text not null,
  title text not null,
  details jsonb not null default '{}',
  created_at timestamptz not null
);

create table if not exists bot_sessions (
  id text primary key,
  user_id text references users(id) on delete cascade,
  telegram_id text not null,
  current_state text not null,
  data jsonb not null default '{}',
  updated_at timestamptz not null
);

create index if not exists cases_user_id_idx on cases(user_id);
create index if not exists cases_expert_id_idx on cases(expert_id);
create index if not exists notifications_user_id_idx on notifications(user_id);
create index if not exists audit_logs_case_id_idx on audit_logs(case_id);
create index if not exists expert_recommendations_case_id_idx on expert_recommendations(case_id);
`;
}
