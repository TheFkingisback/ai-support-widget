-- AI Support Widget — Initial schema
-- Run: docker exec -i aiwidget-postgres psql -U aiwidget -d aiwidget_dev < server/src/migrations/001-init.sql

CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  plan VARCHAR(20) NOT NULL DEFAULT 'starter',
  config JSONB NOT NULL DEFAULT '{}',
  api_base_url TEXT NOT NULL,
  service_token TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cases (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  snapshot_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  message_count INTEGER NOT NULL DEFAULT 0,
  feedback VARCHAR(10)
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL,
  role VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  actions JSONB NOT NULL DEFAULT '[]',
  evidence JSONB NOT NULL DEFAULT '[]',
  confidence REAL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS snapshots (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  case_id TEXT NOT NULL,
  data JSONB NOT NULL,
  bytes_total INTEGER NOT NULL DEFAULT 0,
  truncation JSONB NOT NULL DEFAULT '{"eventsRemoved":0,"logsTrimmed":false,"docsRemoved":0}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  case_id TEXT,
  action TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS llm_costs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  model TEXT NOT NULL,
  tokens_in INTEGER NOT NULL DEFAULT 0,
  tokens_out INTEGER NOT NULL DEFAULT 0,
  estimated_cost REAL NOT NULL DEFAULT 0,
  case_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_cases_tenant ON cases(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cases_user ON cases(user_id);
CREATE INDEX IF NOT EXISTS idx_cases_created ON cases(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_case ON messages(case_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_case ON snapshots(case_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_tenant ON snapshots(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_tenant ON audit_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_llm_costs_tenant ON llm_costs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_llm_costs_case ON llm_costs(case_id);
