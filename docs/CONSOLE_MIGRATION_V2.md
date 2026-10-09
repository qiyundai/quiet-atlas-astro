# Console v0.2.0 migration checkpoint — 2026-10-08

Deployed at https://admin.quietatlas.io/, version
`ad9cc923-a57b-484c-b7e1-e9d11fe1f6bb`. Existing exact-owner Access application,
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
  account was deleted or revived. This is backend integration proof, not a
  substitute for owner browser acceptance.
- Darts 29 signaling/monitoring tests passed. Production native forced-TURN
  smoke: 220 checks, zero failures. Public signaling `/health` and website 200;
  owner console/new APIs/Activity anonymous 302; disabled direct origin 404.
- Live game DO namespace IDs and existing production TURN secrets were retained.
  Production admission remains 120 rooms/hour, 500 credentials/day, TTL 1800s.
- Root public-site build passed with its pre-existing image/prerender warnings.
  Clean npm lockfile generation audited zero vulnerabilities; Linux hosted CI
  must also be checked against the pushed commit.

## Incomplete acceptance and configuration

Browser automation's admin security-policy check was unavailable. No bypass was
attempted. New module rendering, mobile navigation, live owner session and
browser CSP acceptance remain unverified. Restore browser access and perform
those checks before removing the legacy dashboards. Keep private screenshots
outside this public repository.

Account analytics read credential, isolated staging TURN credentials and
authenticated notification sender remain pending. No new persistent account
token, staging TURN key or email sender was created in this increment. Ops cron
is still inactive; production health reports monitoring_ok false honestly.
Email inbox delivery and alert/recovery verification remain required. Website
visitor/performance/deployment reporting and legacy dashboard redirects remain
unfinished. Nomadic Hearth has no backend to connect yet.

Private backend revisions: King's production `e7f12bac-e833-4531-9286-1ffed6ac3217`,
staging `c9529f0a-a99c-4976-8c03-10b866e45a81`; Darts production
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
