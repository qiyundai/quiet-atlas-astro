# Console v0.2.0 migration checkpoint — 2026-10-08

Deployed at https://admin.quietatlas.io/, version
`9b165dbc-342a-4f3c-93a7-b6e7ed21f9e1`. Existing exact-owner Access application,
audience and disabled direct origin are preserved. Public Astro site source and
root dependencies are unchanged. Owner/account identifiers and operational
screenshots stay outside this public repository.

## Connected modules

- King's Search: existing React list/detail/filter/pagination and confirmation
  components ported into the shared shell. Production/staging selection;
  statistics, users, characters, campaigns, active slots and invitations.
  Narrow named `ConsoleService` bindings, no browser-controlled upstream URL,
  SQL, credential or actor. D1 remains owned by King's backend.
- Actions: account deletion (blocked by active slots), saved-character revival,
  slot tracking cleanup, invitation generation and unused invitation deletion.
  Each domain mutation, retry receipt and successful audit commit atomically in
  one D1 batch. Failed preconditions cannot claim or mutate. Committed domain
  rejections are recorded; transient uncommitted failures remain retryable and
  use the console request ID in logs. Used invitations remain used after account
  deletion. Slot cleanup does not terminate live campaign Durable Objects.
- Darts: fresh admission counters, occupancy leases with timestamps, analytics
  window/build/client filters, weighted quality percentiles, truncation and
  missing-source states. Lease members are not DAU or a gameplay capacity claim.
  Pause/resume retains existing connections, credential refresh and counters;
  state, receipt and audit commit together in the existing admission DO.
- Shared Activity: independent backend reads, per-environment, latest 100 per
  game. Infrastructure: bounded account GraphQL adapter with allowlisted Worker
  names, account DO/TURN totals and qualified soft-budget estimates. A missing
  analytics credential produces unavailable values, never invented zero usage.
- CSP: exact hashes generated from built Astro hydration scripts/styles. No
  unsafe-inline/eval. Every page, asset, API and client route validates owner
  identity before serving. Mutation bodies are bounded and require same origin,
  JSON, an allowed action and UUID idempotency key.

## Verified

- Fresh branch/upstream synchronization in all three repositories.
- Console `npm run validate`: 11 tests, actual signed owner JWTs, actual workerd
  assets/RPC, bounded failures, production/staging separation, query/action/body
  validation, CSRF rejection, strict CSP hash coverage, types and deploy dry run.
- King's build/types, existing 55-request admin regression, new actual D1/RPC
  command suite: concurrent invite retries create one set, replay is durable,
  keys cannot be repurposed, used-code and active-slot deletion are rejected,
  a forced account-delete failure rolls back both domain state and receipt.
- Live authenticated Wrangler private binding checks: King's production and
  staging summary readiness/stats/audit; staging concurrent invitation replay
  and cleanup; Darts production/staging summary, monitoring and audit; staging
  pause/resume and durable replay, restoring its original state. No real player
  account was deleted or revived.
- Live owner browser: King's records, corrected mixed seconds/milliseconds/ISO
  dates, status filtering and detail navigation; Darts production/staging
  monitoring and confirmed staging pause then resume; shared staging Activity
  showed both games' committed changes. The original admission state was restored.
  Browser error/warning logs were empty. Infrastructure honestly reported the
  missing credential. Mobile navigation and wrapped game tabs passed at 390 x
  844 with no horizontal page overflow. Late Darts history requests are cancelled
  on filter changes/unmount so old-environment records cannot replace new data.
- Darts 29 signaling/monitoring tests passed. Production native forced-TURN
  smoke: 220 checks, zero failures. Public signaling `/health` and website 200;
  owner console/new APIs/Activity anonymous 302; disabled direct origin 404.
- Live game DO namespace IDs and existing production TURN secrets were retained.
  Production admission remains 120 rooms/hour, 500 credentials/day, TTL 1800s.
- Root public-site build passed with its pre-existing image/prerender warnings.
  Clean npm lockfile generation audited zero vulnerabilities. Console Linux CI
  passed at bdbf7be577ea1356ebfa637b1e4703abef8510e9 (run 37886102805);
  check subsequent heads separately. King's hosted job annotation explicitly
  reports that an Actions budget prevented the job from starting (run
  37886145960); local passing tests are not a hosted CI pass.

## Remaining configuration and cutover

The earlier browser policy-check outage recovered without a bypass. Real owner
and responsive acceptance now passed as recorded above. Private screenshots stay
outside this public repository. Legacy dashboards remain available until the
remaining source, alert-delivery and parity/cutover gates are complete.

Account analytics read credential, isolated staging TURN credentials and
authenticated notification sender remain pending. No new persistent account
token, staging TURN key or email sender was created in this increment. The exact
account-owned Account Analytics Read-only token, expiring January 7, 2027, is
prepared at the Cloudflare review screen awaiting action-time approval. Email
Sending lists no onboarded sending subdomains. Ops cron
is still inactive; production health reports monitoring_ok false honestly.
Email inbox delivery and alert/recovery verification remain required. Website
visitor/performance/deployment reporting and legacy dashboard redirects remain
unfinished. Nomadic Hearth has no backend to connect yet.

Private backend revisions: King's production `5de5fbbc-6e0e-4cf2-a8cf-4fcf1dc733b4`,
staging `6bb52d7c-abe9-4dd7-a2dd-7e9062bb0937`; Darts production
`43298b91-211b-4dc7-9a73-42b694aa9baa`, staging
`e81b9ce2-a7e5-4439-9d95-6f563ff5ae62`; private ops
`5f3de806-fe5b-4416-b6d1-79dff50017b5`.

## Rollback

Retain the legacy Access apps and dashboards until parity is accepted. Console
foundation version `8fe09ea7-7968-454d-ba8d-c8f731fc316e` can restore the previous
shell if needed. Additive King's migrations 0019/0020 do not require rollback:
they preserve game records; never drop audit receipts to revert UI code. Revert
Worker code while preserving existing secrets and DO namespaces; do not reset
the database or migration history. Keep game frontend and public-site deployment
independent.
