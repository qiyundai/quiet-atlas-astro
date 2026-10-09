# Quiet Atlas Console

Owner-only shared operations workspace at `https://admin.quietatlas.io`. This is
console v0.2.0: common identity and navigation, private game summaries, King's
Search administration, Darts monitoring and audited admission controls, plus
shared activity and account infrastructure views. Analytics/cost require the
pending account-restricted read credential. Email delivery and website
analytics/deployments are not verified yet; missing sources say unavailable.

The public Astro site at the repository root keeps its current build and Pages
deployment. The console has a separate Astro static build and Cloudflare Worker.
Its dependencies are pinned independently; the root Astro version is unchanged.

## Run and validate

Use Node 24 (minimum 22.12). From the repository root:

```sh
npm ci
cd apps/console
npm ci
npm run validate
npm run dev
```

Open `http://localhost:8810`. Local preview has a visible environment label and
no production service bindings or website probes. The parent dependencies are
required because Vite reads the parent site's Astro tsconfig during build.

`validate` generates binding/runtime types, checks Worker and client TypeScript,
builds eight routes, runs signed-JWT and real workerd/static-asset tests, and
bundles a Wrangler deployment without publishing. No Cloudflare token is needed
for local validation. Production deployment requires existing Wrangler login.
The generated `worker-configuration.d.ts` stays outside Git; regenerate it with
`npm run types` before running the TypeScript check alone.

```sh
npm run deploy
```

Create/review the exact-owner Cloudflare Access application for
`admin.quietatlas.io` **before** deploying the custom domain. Copy
`deployment.example.json` to ignored `deployment.local.json` and fill the actual
account ID, team hostname, app-specific AUD and exact owner email after reviewing
the saved policy. Set `accessAppVerified` true only after that review. The deploy
tool supplies the three owner settings as secrets during the initial publish,
using a temporary private file that is removed afterward. Keep the local file
and its values out of Git. Do not reuse the Darts or King's audience. Missing configuration fails
closed. All assets and APIs pass through the Worker; `workers.dev` and preview
URLs are disabled. Do not deploy `--env local` to a publicly accessible domain.
The `predeploy` check rejects missing private settings or unsafe asset/origin
settings. No real owner email or account identifiers are stored in public source.

## Data sources

| Resource | Private connection | Administrative migration |
| --- | --- | --- |
| King's Search | `KINGS_ADMIN` / `KINGS_STAGE` → admin `ConsoleService` | Statistics, players, characters, campaigns, slots, invitations and audit; production/staging selector |
| Darts vs Squirts | `DARTS_OPS` → private ops `ConsoleService` | Occupancy leases, admission budgets, quality filters, pause/resume and audit; missing analytics explicit |
| Quiet Atlas | HEAD of fixed public `https://quietatlas.io/` | Traffic/deployment/performance pending |
| Nomadic Hearth | Not connected | Reserved future workspace |

Health checks have a three-second bound and 4 KiB JSON body limit. A responding
game endpoint means **reachable**, not database/gameplay-ready or capacity-tested.
One failed source does not fail the other cards. Overview loads bounded game
snapshots on entry and manual refresh; there is no browser polling interval.
This console does not bind game D1 databases or hold account analytics tokens.
Mutations require verified owner identity, exact same-origin requests, bounded
JSON, an explicit action allowlist and a durable retry key. King's commands and
audit commit in one D1 batch; Darts pause state and audit commit in one DO
transaction. Retries retain their key after uncertain network/server failures.
Shared Activity shows the latest 100 records per game; the King's module also
offers pagination. Availability checks are not administrative audit events.

React islands use exact build-generated script/style CSP hashes. Build before
checking types because `.generated/csp.json` is generated, never committed.
Do not add unsafe-inline/eval to repair hydration. See the current
[migration validation](../../docs/CONSOLE_MIGRATION_V2.md) for deployment and
remaining acceptance gates.

See [foundation architecture](../../docs/CONSOLE_FOUNDATION.md) and
[continuation handoff](../../docs/CONSOLE_MIGRATION_HANDOFF.md).
