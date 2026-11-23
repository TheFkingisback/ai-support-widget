ALTER TABLE cases ADD COLUMN IF NOT EXISTS rating INTEGER;

CREATE TABLE IF NOT EXISTS workspaces (
  id text PRIMARY KEY,
  name text NOT NULL,
  staging_id text NOT NULL UNIQUE REFERENCES tenants(id),
  production_id text NOT NULL UNIQUE REFERENCES tenants(id),
  sandbox_id text NOT NULL UNIQUE REFERENCES tenants(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workspace_accounts (
  email text PRIMARY KEY,
  workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'developer', 'support'))
);

CREATE TABLE IF NOT EXISTS workspace_login_links (
  token_hash text PRIMARY KEY,
  email text NOT NULL,
  workspace_name text NOT NULL,
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS workspace_links_expiry ON workspace_login_links(expires_at);

CREATE TABLE IF NOT EXISTS workspace_sessions (
  token_hash text PRIMARY KEY,
  account_email text NOT NULL REFERENCES workspace_accounts(email) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS workspace_sessions_expiry ON workspace_sessions(expires_at);

CREATE TABLE IF NOT EXISTS workspace_origins (
  tenant_id text NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  origin text NOT NULL,
  challenge text NOT NULL,
  verified_at timestamptz,
  PRIMARY KEY (tenant_id, origin)
);
CREATE INDEX IF NOT EXISTS workspace_verified_origin ON workspace_origins(origin) WHERE verified_at IS NOT NULL;
