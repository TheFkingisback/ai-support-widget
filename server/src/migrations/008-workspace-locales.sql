ALTER TABLE workspace_accounts ADD COLUMN IF NOT EXISTS locale text;
ALTER TABLE workspace_login_links ADD COLUMN IF NOT EXISTS locale text;
