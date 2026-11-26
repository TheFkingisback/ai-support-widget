ALTER TABLE tenants ADD COLUMN IF NOT EXISTS admin_api_key_hash text;
UPDATE tenants SET admin_api_key_hash = config->>'adminApiKeyHash'
WHERE admin_api_key_hash IS NULL AND config ? 'adminApiKeyHash';
CREATE UNIQUE INDEX IF NOT EXISTS tenants_admin_key_lookup ON tenants(admin_api_key_hash) WHERE admin_api_key_hash IS NOT NULL;

-- The column controls key rotation. A previous binary may read its JSON mirror,
-- but a stale settings save must never restore a revoked key.
CREATE OR REPLACE FUNCTION tenant_admin_key_mirror() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.admin_api_key_hash := coalesce(NEW.admin_api_key_hash, NEW.config->>'adminApiKeyHash');
  ELSIF NEW.admin_api_key_hash IS NOT DISTINCT FROM OLD.admin_api_key_hash
    AND (NEW.config->>'adminApiKeyHash') IS DISTINCT FROM (OLD.config->>'adminApiKeyHash') THEN
    RAISE EXCEPTION 'Rotate administrative keys through the current key service';
  END IF;
  IF NEW.admin_api_key_hash IS NOT NULL THEN
    NEW.config := jsonb_set(NEW.config, '{adminApiKeyHash}', to_jsonb(NEW.admin_api_key_hash));
  END IF;
  RETURN NEW;
END $$;
CREATE OR REPLACE TRIGGER tenant_admin_key_mirror BEFORE INSERT OR UPDATE OF config, admin_api_key_hash ON tenants
FOR EACH ROW EXECUTE FUNCTION tenant_admin_key_mirror();

ALTER TABLE widget_turn_requests ADD COLUMN IF NOT EXISTS case_id text;
ALTER TABLE widget_turn_requests ADD COLUMN IF NOT EXISTS lease_until timestamptz;
ALTER TABLE widget_turn_requests ADD COLUMN IF NOT EXISTS lease_owner uuid;
UPDATE widget_turn_requests SET case_id = coalesce(result #>> '{value,case,id}', result #>> '{value,message,caseId}')
WHERE case_id IS NULL AND result ? 'value';
DELETE FROM widget_turn_requests t WHERE case_id IS NOT NULL AND result ? 'value'
AND NOT EXISTS (SELECT 1 FROM cases c WHERE c.id = t.case_id AND c.tenant_id = t.tenant_id AND c.user_id = t.user_id);
-- Old failures have no case reference and may contain upstream diagnostic text.
-- Preserve their status/code for replay and discard the free-form message.
UPDATE widget_turn_requests SET result=jsonb_set(result, '{error,message}', '"The previous request could not be completed"')
WHERE case_id IS NULL AND lease_until IS NULL AND result ? 'error'
AND result #>> '{error,message}' IS DISTINCT FROM 'The previous request could not be completed';
CREATE INDEX IF NOT EXISTS widget_turn_case ON widget_turn_requests(tenant_id, case_id);
CREATE INDEX IF NOT EXISTS cases_recent ON cases(created_at DESC, id DESC);

-- Existing installations may contain historical orphans. New writes and deletes
-- get referential integrity immediately, without scanning those large tables.
DO $$
DECLARE child text;
BEGIN
  FOREACH child IN ARRAY ARRAY['messages', 'snapshots', 'llm_costs', 'audit_log'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_constraint
        WHERE conrelid = child::regclass AND conname = child || '_case_fk') THEN
      EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE NOT VALID',
        child, child || '_case_fk');
    END IF;
  END LOOP;
END $$;
CREATE INDEX IF NOT EXISTS audit_case_retention ON audit_log(case_id) WHERE case_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS cases_retention ON cases(updated_at, id);
CREATE INDEX IF NOT EXISTS messages_first_reply ON messages(case_id, created_at) WHERE role='assistant';
