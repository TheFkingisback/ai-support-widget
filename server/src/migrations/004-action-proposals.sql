BEGIN;
ALTER TABLE tenant_mcp ADD COLUMN IF NOT EXISTS action_policy jsonb;
CREATE TABLE IF NOT EXISTS action_proposals (
 sequence bigserial NOT NULL, id text PRIMARY KEY, tenant_id text NOT NULL REFERENCES tenants(id),
 user_id text NOT NULL, case_id text NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
 proposal jsonb NOT NULL, state text NOT NULL CHECK (state IN
 ('pending_confirmation','executing','unknown','completed','failed','conflict','expired','cancelled')),
 connector_hash text NOT NULL, presented_message_id text REFERENCES messages(id) ON DELETE SET NULL,
 confirmation_message_id text REFERENCES messages(id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS action_proposals_remote_id ON action_proposals(tenant_id,user_id,case_id,(proposal->>'actionId'));
CREATE INDEX IF NOT EXISTS action_proposals_scope ON action_proposals(tenant_id,user_id,case_id,sequence DESC);
CREATE UNIQUE INDEX IF NOT EXISTS action_proposals_one_pending ON action_proposals(tenant_id,user_id,case_id)
 WHERE state IN ('pending_confirmation','executing','unknown');
COMMIT;
