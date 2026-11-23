# Public launch operations

The site, starter, workspace, sandbox, and application integration are free. The workspace uses your existing Support AI API and tenant data model. It provisions separate sandbox, staging, and production tenants.

## Postmark configuration

The workspace sends one-time links through Postmark’s transactional `outbound` stream. Configure `POSTMARK_SERVER_TOKEN` and `POSTMARK_FROM` in `/root/ai-support-secrets/workspaces.env` on the Support AI host. Use the Server API Token for the selected transactional server and a sender address verified in Postmark. Keep that file readable only by the deployment owner. The release script loads it as a private Compose environment file. Email signup reports its availability through `GET /api/workspace/availability`.

The production sender is `no-reply@ai-support.pontes.uk`. Postmark uses its DKIM TXT selector under `_domainkey.ai-support.pontes.uk` and the DNS-only CNAME `pm-bounces.ai-support.pontes.uk` pointing to `pm.mtasv.net`. Keep the existing Microsoft 365 records for `pontes.uk` intact when maintaining these records.

## Release and recovery

Use the source from the verified Git commit in a new `/root/ai-support-releases/launch-<commit>` directory. Run `bash scripts/release-support.sh` to build candidate images and check the web image locally. Add `--activate` to back up PostgreSQL, apply additive migrations, update the existing service containers, and check both services. The script preserves the action-signing overlay and keeps the previous images and database backup in `/root/ops-backups/launch-<commit>`. Successful activation updates the `current` and `current-web` pointers.

Check the public home, demo, starter ZIP, signup, Dev Center, and API health after activation. With Postmark configured, verify delivery to an authorized test inbox and complete the workflow through workspace creation and a sandbox reply. Verify staging origin DNS and credential issuance using a test environment you control.

The launch deployment runs a Redis-backed conversation queue with append-only persistence. Inline mode runs producers and workers in each application process. For separate processes, use `TURN_QUEUE_MODE=producer` on API hosts and `TURN_QUEUE_MODE=worker` on worker hosts. Both roles need the same Redis, database, and token-encryption configuration. Monitor worker errors, queue age, memory, and provider latency. Workspaces can invite developers and support teammates and view conversation history by environment.

## Local verification

Run `bash scripts/verify-release.sh` from the repository. Set `WORKSPACE_TEST_DATABASE_URL` and `ACTION_TEST_DATABASE_URL` to a dedicated local PostgreSQL database named `aiwidget_dev` to include the database-backed tests. Rebuild the pinned SDK with `npm run build --workspace @ai-support/widget` and refresh the starter ZIP with [the packaging script](integration/starter/package.ps1).
