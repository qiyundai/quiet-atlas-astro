# Continue the Quiet Atlas console migration

## Current checkpoint: console v0.2.0

Private summaries, King's administration, Darts monitoring/admission, atomic
backend audit/idempotency and shared Activity/Infrastructure are implemented
and deployed. Both live production/staging private API checks passed. Read
[CONSOLE_MIGRATION_V2.md](CONSOLE_MIGRATION_V2.md) first. The foundation-only
description below records the earlier starting point, not current capability.

Remaining: restore browser access for owner/mobile/CSP verification; complete
approved account analytics credential, staging TURN and authenticated email
setup; verify collection and inbox delivery; add verified website deployment /
visitor sources; perform legacy dashboard cutover only after parity acceptance.
Do not merge the draft PRs or raise admission limits as an assumed next step.

## Starting point

Repository: `qiyundai/quiet-atlas-astro`; branch:
`codex/unified-console-foundation`. First-step checkout:
`C:\Code\darts-vs-squirts\builds\quiet-atlas-astro` (a real nested Git checkout,
ignored by the outer game repository). Start by checking status/branch and
synchronizing origin. Do not use the original unsynchronized public-site folder.

Read `apps/console/README.md`, `apps/console/AGENTS.md` and
`docs/CONSOLE_FOUNDATION.md`. The console is a separate application under
`apps/console`, not an Astro upgrade or route added to the public site.

## Migration sequence and acceptance gates

The foundation is deployed at **https://admin.quietatlas.io/**. Owner GitHub
sign-in, anonymous page/asset/API blocking, disabled workers.dev origin,
live overview data and structured request logging passed on 2026-10-08.
See `CONSOLE_VALIDATION.md` for evidence and remaining limitations. Continue
with step 2 below, retaining step 1's checks as regression gates. King's health
probe currently fails: the inspected API revision lacks `/health`; implement
its supported private summary/health contract before labeling it ready.

1. **Foundation acceptance.** Verify live owner login, anonymous Access redirects,
   no direct-origin asset/API bypass, active navigation, service availability,
   disconnected reporting labels and desktop/mobile rendering. The local suite
   tests real signed JWTs, real workerd asset routing and bounded service probes.
   Do not advertise a shared dashboard with migrated game controls yet.
2. **Private summary APIs.** Freshly sync each owning game repository. Export a
   dedicated `ConsoleService` entrypoint implementing the versioned summary
   contract; use explicit service bindings for this entrypoint. Keep the actor
   derived from verified console auth. Expose narrow sanitized summaries, never
   a generic SQL/HTTP proxy, old admin key, Access JWT passthrough or shared D1.
   Add an authenticated owner integration test on production and isolated stage.
3. **Darts monitoring module.** Port the existing ops overview UI/data adapter,
   keeping lease snapshots separate from event totals, query windows/freshness,
   real network route/RTT/bytes, client opt-out and stale/missing-source states.
   Complete the pending monitoring deployment and live capacity validation;
   reporting must show which measurements are actually available.
4. **King's read-only administration.** Move statistics, users/characters,
   campaigns/active campaigns and invitation lists. Reuse the existing React
   components where suitable through Astro islands, with console same-origin
   APIs. Preserve pagination, filtering and current data semantics. Confirm
   actual production DB readiness; the game's public `/health` is insufficient.
5. **Audit and mutations.** Implement persistent backend-owned audit first.
   Then port each existing action with explicit request/response schemas,
   capability allowlists, owner checks, CSRF/origin enforcement, idempotency,
   confirmed destructive actions and existing transactional invariants. Verify
   behavior and audit outcomes in staging before production. Do not create broad
   mutation routing because most traffic is low.
6. **Website and shared infrastructure.** Connect real Cloudflare analytics,
   deployment metadata, D1/storage/Workers/relay usage, known plan limits and
   budgets. Use a scoped read-only credential only if needed and authorized;
   store it as a Worker secret. Add collection/freshness/failure/retention rules
   and alerts. For site metrics distinguish bots, visitors, page views and
   cache/HTTP traffic. Verify Pages deploy history for `quiet-atlas-astro`.
7. **Cutover.** Compare old/new modules with real owner workflows. Move old
   dashboard URLs to protected redirects only after feature parity, audit and
   rollback checks pass. Preserve bookmarks and keep game backends independent.
   Add other game repositories to the registry only after checking their actual
   ownership, backend names, admin contracts and deployment state.

## Source inventory verified 2026-10-08

Retrieve account/zone/app IDs and the exact Access team from the authenticated
Cloudflare account. Reuse the existing **Darts vs Squirts owner** policy only
after confirming its single exact-owner email condition. Do not infer the team's
spelling from the brand. Private details are intentionally excluded from this
public repo; this task's local `builds/quiet-atlas-console-private-handoff.txt`
contains the verified source inventory for the continuing agent.

| Source | Existing resources | Current integration |
| --- | --- | --- |
| Public Quiet Atlas | Pages project `quiet-atlas-astro`; `quietatlas.io` | Fixed public HEAD check; no visitor or deploy analytics yet |
| King's Search | `kings-search-api`, `kings-search-admin`; staging counterparts; Pages `kings-search` | Private API `/health` + old dashboard link |
| Darts vs Squirts | `darts-vs-squirts-signaling`, staging counterpart, `darts-vs-squirts-ops` | Private signaling `/health` + old dashboard link |
| Nomadic Hearth | No backend identified in this increment | Planned, not connected |

Cloudflare also contains `lacuna-api` and Pages `lacuna-app`. They are not added
as an assumed published game or migrated automatically; inspect that repository
and its status when extending the ecosystem.

### King's Search source details

Repository `qiyundai/kings-search`; latest inspected `origin/main` was `4be8f82`.
`C:\Code\kings-search` is currently a bare Git repository: use a fresh working
checkout/worktree, not `git status` there. Fetch before reviewing or editing.
Admin source: `packages/admin` (Worker), `packages/admin/ui` (React/Vite).
Current admin: `https://ks-admin.quietatlas.io`.
Retrieve the existing Access app ID from the account's King's Search Admin app.

Production/staging admin bind corresponding game D1 databases. Existing browser
calls are relative `/api/*` and `/auth/*`; optional programmatic `ADMIN_KEY` is
never a browser credential. Preserve these domain rules during action migration:
slot clearing does not terminate a Durable Object campaign; revival changes the
persistent alive flag; deletion is atomic and blocked for active slots; used
invites remain used. Earlier authenticated production data had not been fully
verified. Inspect current source and live behavior before asserting readiness.

### Darts monitoring prerequisite

Repository `qiyundai/darts-vs-squirts`, draft
[PR #37](https://github.com/qiyundai/darts-vs-squirts/pull/37), branch
`codex/production-monitoring`. Latest verified game commit at foundation start:
`73dd43e0a4c344f0cbfcac71a04394c13ceef8e0`.
Read `docs/PRODUCTION_MONITORING.md` and
`docs/MONITORING_VALIDATION_2026-10-08.md` in that repo.
UI/ops Worker: `signaling/ops/index.js`; Worker settings: `signaling/wrangler.toml`.

The ops implementation exists but its full production deployment was pending
account analytics credentials, staging TURN credentials and notification sender
setup. Those credential/security actions had pending confirmation; foundation
work does not grant permission to create them. Re-check any later user response
before asking again. A legacy Darts AUD cannot authenticate a new console API.
Add a private entrypoint/adaptor and keep the public ops JWT audience separate.

Production signaling still returned legacy health `{ok:true,version:1,
relay_configured:true}` at foundation start; production monitoring wiring,
continuous capacity claims and higher admission limits were not verified.
Existing limits remain 120 rooms/hour, 500 relay credentials/day, 1800-second
relay TTL. The desired scale is 100 concurrent / 1000 daily North America users;
do not raise limits until the documented distributed live tests pass.
The prior lengthy local test hit SQLite IOERR_WRITE around 49 minutes; it does
not prove two-hour or geographic capacity. Local shorter signaling, P2P and
TURN checks passed. Preserve the game repo's required validated Windows ZIP and
Dropbox PR handoff workflow for any shipped game changes; this console PR has
no game binary changes.

## CI, deployment and credentials

The console workflow validates only; it does not auto-publish or introduce a
deployment token. Local Wrangler uses the user's existing OAuth login. Never
copy that token into the Worker, GitHub, docs or browser. No new persistent
credential is needed for the foundation's private health service bindings.

The foundation's hosted Linux Actions validation passed on `de1a03d`. Earlier
game-repository jobs were prevented from starting by the account's Actions
budget; re-check each repository rather than assuming the same status. No
billing change is authorized by this foundation request. Report actual job
evidence and any concrete remaining blocker.
The public site's existing locked dependencies have legacy audit advisories;
they are not upgraded in this increment. The independent console dependency
tree must pass `npm audit --audit-level=high` before handoff.

See `docs/CONSOLE_VALIDATION.md` for this increment's final test/deployment
evidence and any concrete remaining foundation limitations.

## Suggested continuation prompt

Continue the unified Quiet Atlas console migration from the foundation PR in
qiyundai/quiet-atlas-astro. Synchronize the relevant repos first, then read
apps/console/README.md, AGENTS.md, docs/CONSOLE_FOUNDATION.md and this handoff.
Complete the private summary APIs and move Darts monitoring, King's admin,
website analytics, shared infrastructure reporting and audited actions into
admin.quietatlas.io using the acceptance gates above. Preserve game-owned data
and rules, verify real production owner workflows, retain rollback routes, and
retire old surfaces only after parity. Treat missing metrics/credentials and
blocked hosted CI honestly; don't invent stats or create broader credentials
without the required authorization.
