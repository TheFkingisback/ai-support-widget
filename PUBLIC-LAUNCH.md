# Public launch operations

The site, starter, workspace, sandbox, and application integration are free. The workspace uses your existing Support AI API and tenant data model. It provisions separate sandbox, staging, and production tenants.

## Postmark configuration

The workspace sends one-time links through Postmark’s transactional `outbound` stream. Configure `POSTMARK_SERVER_TOKEN` and `POSTMARK_FROM` in `/root/ai-support-secrets/workspaces.env` on the Support AI host. Use the Server API Token for the selected transactional server and a sender address verified in Postmark. Keep that file readable only by the deployment owner. The release script loads it as a private Compose environment file. Email signup reports its availability through `GET /api/workspace/availability`.

The production sender is `no-reply@ai-support.pontes.uk`. Postmark uses its DKIM TXT selector under `_domainkey.ai-support.pontes.uk` and the DNS-only CNAME `pm-bounces.ai-support.pontes.uk` pointing to `pm.mtasv.net`. Keep the existing Microsoft 365 records for `pontes.uk` intact when maintaining these records.

## Release and recovery

Use the source from the verified Git commit in a new `/root/ai-support-releases/launch-<commit>` directory. Run `bash scripts/release-support.sh` to build candidate images and check the web image locally. Add `--activate` to back up PostgreSQL, apply additive migrations, update the existing service containers, and check both services. The script preserves the action-signing overlay and keeps the previous images and database backup in `/root/ops-backups/launch-<commit>`. Successful activation updates the `current` and `current-web` pointers.

Check the public home, demo, starter ZIP, signup, Dev Center, and API health after activation. With Postmark configured, verify delivery to an authorized test inbox and complete the workflow through workspace creation and a sandbox reply. Verify staging origin DNS and credential issuance using a test environment you control.

Use the [release page](https://support-ai.pontes.uk/developers/downloads) for the current set of integration files. `/widget.manifest.json` verifies the versioned JavaScript asset. `/downloads/release-manifest.json` verifies the starter and complete ZIP separately.

The launch deployment runs a Redis-backed conversation queue with append-only persistence. Inline mode runs producers and workers in each application process. For separate processes, use `TURN_QUEUE_MODE=producer` on API hosts and `TURN_QUEUE_MODE=worker` on worker hosts. Both roles need the same Redis, database, and token-encryption configuration. Monitor worker errors, queue age, memory, and provider latency. Workspaces can invite developers and support teammates and view conversation history by environment.

## Language and staging acceptance

The [locale registry](shared/locales.mjs) covers 21 languages in 24 variants. The site matches the browser on first visit and remembers the selected variant. Workspaces apply the account preference to sign-in and invitations. Applications can pass the current user's locale to the widget, which includes it with case and message requests. To provide localized evidence, send approved excerpts in each supported language with matching document IDs and versions.

On 23 November 2026, the public flow passed account creation and invitation through Postmark, staging DNS verification, and issuance of a fifteen-minute session credential. Synthetic support cases produced grounded replies for all 24 variants with the real OpenRouter model. The run also checked user isolation, stable turn retries, closure with and without a rating, ideas isolated by environment, and owner-only configuration of MCP and signed actions. Test workspaces and the temporary DNS TXT record were removed.

Production browser checks covered all 24 homepage variants at phone width, preference persistence, and seven representative variants in the hosted widget demo, including RTL and both Serbian scripts. PartyHost.ai still needs to run its acceptance with its own approved manuals, roles, MCP provider, and physical phones, including the invitation flow from WhatsApp.

## Local verification

Run `bash scripts/verify-release.sh` from the repository. Docker must be running so the check can create and remove its own PostgreSQL and Redis containers. Rebuild the pinned SDK with `npm run build --workspace @ai-support/widget` and refresh the starter ZIP with [the packaging script](integration/starter/package.ps1).

## Migration 010 and SDK 0.2.5

Migration 010 backfills existing administrative key hashes, indexes the session list, and links cached replies and child records to their conversations. Apply it before starting the updated server. During an application rollback the previous binary can read the mirrored key. Use the current server for key rotations.

The production Compose profile allows one trusted proxy hop on the loopback API port. Set `TRUST_PROXY_HOPS=0` when serving clients directly. The default daily spend warning is USD 25 per tenant (UTC). Change `DAILY_COST_ALERT_USD` to set the threshold. The worker logs queue delays over 30 seconds. Both events appear in the normal warning logs.
