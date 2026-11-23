CREATE TABLE IF NOT EXISTS product_suggestions (
  id text PRIMARY KEY,
  tenant_id text NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  case_id text NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  content text NOT NULL,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','reviewing','planned','shipped','declined')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS product_suggestions_recent ON product_suggestions(tenant_id, created_at DESC, id DESC);
