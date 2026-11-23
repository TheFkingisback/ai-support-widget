ALTER TABLE workspace_login_links ADD COLUMN IF NOT EXISTS invited_workspace_id text REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE workspace_login_links ADD COLUMN IF NOT EXISTS invited_role text CHECK (invited_role IN ('developer', 'support'));
CREATE INDEX IF NOT EXISTS workspace_account_members ON workspace_accounts(workspace_id, email);
CREATE INDEX IF NOT EXISTS cases_tenant_recent ON cases(tenant_id, created_at DESC, id DESC);
