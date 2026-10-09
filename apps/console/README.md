# Quiet Atlas Console

Owner-only shared operations workspace at `https://admin.quietatlas.io`. This is
the first migration increment: common identity, navigation, approved branding,
resource registry, availability checks, contracts and an agent handoff. Rich
monitoring, account usage, audit persistence and game actions are not connected
yet. Pending sections say so; they contain no generated statistics.

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
tool installs the three owner settings as private Worker bindings. Keep that file
and its values out of Git. Do not reuse the Darts or King's audience. Missing configuration fails
closed. All assets and APIs pass through the Worker; `workers.dev` and preview
URLs are disabled. Do not deploy `--env local` to a publicly accessible domain.
The `predeploy` check rejects missing private settings or unsafe asset/origin
settings. No real owner email or account identifiers are stored in public source.

## Data sources

| Resource | Foundation connection | Administrative migration |
| --- | --- | --- |
| King's Search | `KINGS_API` → `kings-search-api`, `/health` only | Link to existing admin; users/characters/campaigns/invites pending |
| Darts vs Squirts | `DARTS_SIGNALING` → `darts-vs-squirts-signaling`, `/health` only | Link to existing ops; detailed monitoring/admission pending |
| Quiet Atlas | HEAD of fixed public `https://quietatlas.io/` | Traffic/deployment/performance pending |
| Nomadic Hearth | Not connected | Reserved future workspace |

Health checks have a three-second bound and 4 KiB JSON body limit. A responding
game endpoint means **reachable**, not database/gameplay-ready or capacity-tested.
One failed source does not fail the other cards. Refresh is manual; no scheduled
polling or storage is introduced. This console does not bind game D1 databases.

See [foundation architecture](../../docs/CONSOLE_FOUNDATION.md) and
[continuation handoff](../../docs/CONSOLE_MIGRATION_HANDOFF.md).
