CREATE TABLE IF NOT EXISTS widget_turn_requests (
  tenant_id text NOT NULL,
  user_id text NOT NULL,
  client_id uuid NOT NULL,
  fingerprint text NOT NULL,
  result jsonb,
  completed_at timestamptz,
  PRIMARY KEY (tenant_id, user_id, client_id)
);
