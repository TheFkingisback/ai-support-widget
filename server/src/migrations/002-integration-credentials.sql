-- Additive migration. Existing tenants have no integration credential until provisioned.
CREATE TABLE IF NOT EXISTS integration_credentials (
  tenant_id text PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  id text NOT NULL UNIQUE,
  token_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
